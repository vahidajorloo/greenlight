# frozen_string_literal: true

class AddCameraAndParticipantOptions < ActiveRecord::Migration[7.0]
  OPTIONS = {
    'webcamsOnlyForModerator' => 'false',
    'meetingCameraCap'        => '0',
    'userCameraCap'           => '3',
    'maxParticipants'         => '0'
  }.freeze

  def up
    OPTIONS.each do |name, default_value|
      MeetingOption.find_or_create_by!(name: name) do |option|
        option.default_value = default_value
      end
    end

    providers = RoomsConfiguration.distinct.pluck(:provider).compact
    providers = ['greenlight'] if providers.empty?

    providers.each do |provider|
      OPTIONS.each_key do |name|
        option = MeetingOption.find_by!(name: name)

        RoomsConfiguration.find_or_create_by!(
          meeting_option: option,
          provider: provider
        ) do |configuration|
          configuration.value = 'optional'
        end
      end
    end
  end

  def down
    raise ActiveRecord::IrreversibleMigration,
          'This migration may reuse pre-existing meeting options and configurations.'
  end
end
