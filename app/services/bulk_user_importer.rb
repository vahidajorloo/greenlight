# frozen_string_literal: true

class BulkUserImporter
  MAX_ROWS = 1000
  BATCH_SIZE = 20

  PASSWORD_REGEX = %r{\A(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[`@%~!#£$\\^&*()\]\[+={}/|:;"'<>\-,.?_ ]).{8,}\z}

  Result = Struct.new(:row, :name, :email, :password, :role_name, :valid, :errors, :created, keyword_init: true)

  def initialize(content:, current_user:, provider:)
    @content = content.to_s
    @current_user = current_user
    @provider = provider
    @roles = Role.with_provider(provider).index_by { |r| r.name.downcase }
    @existing_emails = User.with_provider(provider).pluck(:email).map(&:downcase).to_set
    @seen_emails = Set.new
    @can_create_admin = current_user.role.name == 'Administrator' || current_user.super_admin?
  end

  # ---------- IMPORT ----------
  def parse_and_validate
    rows = parse_rows
    return { error: 'too_many_rows', max: MAX_ROWS } if rows.size > MAX_ROWS
    return { error: 'empty' } if rows.empty?

    results = rows.map.with_index(1) { |raw, idx| validate_row(raw, idx) }
    { results: results }
  end

  def import(valid_rows)
    created = []
    failed = []

    valid_rows.each_slice(BATCH_SIZE) do |batch|
      batch.each do |row|
        role = @roles[row[:role_name].downcase]
        user = UserCreator.new(
          user_params: {
            name: row[:name],
            email: row[:email],
            password: row[:password],
            language: @current_user.language || I18n.default_locale
          },
          provider: @provider,
          role: role
        ).call

        user.verified = true
        user.status = :active

        if user.save
          create_default_room_for(user)
          created << { email: user.email, name: user.name, role: role.name }
        else
          failed << { email: row[:email], errors: user.errors.full_messages }
        end
      end
    end

    { created: created, failed: failed }
  end

  # ---------- DELETE ----------
  def parse_emails_for_delete
    rows = parse_rows
    return { error: 'too_many_rows', max: MAX_ROWS } if rows.size > MAX_ROWS
    return { error: 'empty' } if rows.empty?

    emails = rows.map { |r| r[:email].to_s.downcase.strip }.reject(&:blank?).uniq
    { emails: emails }
  end

  def preview_delete(emails)
    users = User.with_provider(@provider)
                .includes(:role)
                .where('LOWER(email) IN (?)', emails.map(&:downcase))

    # Never allow deleting yourself
    users = users.where.not(id: @current_user.id)

    {
      found: users.map { |u| { id: u.id, name: u.name, email: u.email, role: u.role.name } },
      not_found: emails.map(&:downcase) - users.map { |u| u.email.downcase }
    }
  end

  def delete_users(user_ids)
    users = User.with_provider(@provider).where(id: user_ids).where.not(id: @current_user.id)
    deleted = []
    failed = []

    users.find_each do |user|
      if user.destroy
        deleted << { email: user.email, name: user.name }
      else
        failed << { email: user.email, errors: user.errors.full_messages }
      end
    end

    { deleted: deleted, failed: failed }
  end

  private

  def parse_rows
    lines = @content.lines.map(&:strip).reject { |l| l.blank? || l.start_with?('#') }
    return [] if lines.empty?

    rows = []
    lines.each do |line|
      parsed = parse_single_line(line)
      rows << parsed if parsed
    end
    rows
  end

  def parse_single_line(line)
    if line.start_with?('[')
      begin
        arr = JSON.parse(line)
        return nil unless arr.is_a?(Array) && arr.size >= 2  # name + email minimum for delete
        return {
          name: arr[0].to_s.strip,
          email: arr[1].to_s.strip,
          password: arr[2].to_s,
          role_name: (arr[3] || 'User').to_s.strip
        }
      rescue JSON::ParserError
        # fall through
      end
    end

    # Plain email-only line (just an email address)
    if line.match?(/\A[\w\-.+]+@[\w\-.]+\.[a-z]+\z/i)
      return {
        name: '',
        email: line.strip,
        password: '',
        role_name: 'User'
      }
    end

    begin
      require 'csv' unless defined?(CSV)
      cols = CSV.parse_line(line)
      return nil if cols.nil? || cols.compact.empty?
      return nil if %w[name email password role].include?(cols[0].to_s.downcase)

      # If only one column and it looks like an email
      if cols.size == 1 && cols[0].to_s.match?(/\A[\w\-.+]+@[\w\-.]+\.[a-z]+\z/i)
        return {
          name: '',
          email: cols[0].to_s.strip,
          password: '',
          role_name: 'User'
        }
      end

      {
        name: cols[0].to_s.strip,
        email: cols[1].to_s.strip,
        password: cols[2].to_s,
        role_name: (cols[3] || 'User').to_s.strip
      }
    rescue CSV::MalformedCSVError
      nil
    end
  end

  def validate_row(raw, idx)
    errors = []
    name = raw[:name]
    email = raw[:email].to_s.downcase
    password = raw[:password]
    role_name = raw[:role_name].presence || 'User'

    errors << 'missing_name' if name.blank?
    errors << 'invalid_email' unless email.match?(/\A[\w\-.+]+@[\w\-.]+\.[a-z]+\z/i)
    errors << 'email_exists' if @existing_emails.include?(email)
    errors << 'duplicate_in_file' if @seen_emails.include?(email)
    @seen_emails << email if email.present?

    if password.blank?
      errors << 'missing_password'
    elsif password.length > 255
      errors << 'password_too_long'
    elsif !password.match?(PASSWORD_REGEX)
      errors << 'weak_password'
    end

    role = @roles[role_name.downcase]
    if role.nil?
      errors << 'role_not_found'
    elsif role.name == 'Administrator' && !@can_create_admin
      errors << 'cannot_create_admin'
    end

    Result.new(
      row: idx,
      name: name,
      email: email,
      password: password,
      role_name: role_name,
      valid: errors.empty?,
      errors: errors,
      created: false
    )
  end

  def create_default_room_for(user)
    return if user.rooms.count > 0
    return unless PermissionsChecker.new(
      permission_names: 'CreateRoom',
      user_id: user.id,
      current_user: user,
      current_provider: @provider
    ).call

    Room.create(
      name: I18n.t('room.new_room_name', username: user.name, locale: user.language),
      user_id: user.id
    )
  end
end
