# frozen_string_literal: true

module Api
  module V1
    module Admin
      class BulkUsersController < ApiController
        before_action do
          ensure_authorized('ManageUsers')
        end

        # POST /api/v1/admin/bulk_users/preview
        def preview
          content = params[:content].to_s
          return render_error errors: ['empty'], status: :bad_request if content.blank?

          importer = BulkUserImporter.new(
            content: content,
            current_user: current_user,
            provider: current_provider
          )

          result = importer.parse_and_validate
          return render_error errors: [result[:error]], status: :unprocessable_entity if result[:error]

          safe = result[:results].map do |r|
            {
              row: r.row,
              name: r.name,
              email: r.email,
              role_name: r.role_name,
              valid: r.valid,
              errors: r.errors
            }
          end

          render_data data: { rows: safe }, status: :ok
        end

        # POST /api/v1/admin/bulk_users/import
        def import
          rows = params[:rows]
          return render_error errors: ['empty'], status: :bad_request if rows.blank?

          content = rows.map { |r|
            [r[:name], r[:email], r[:password], r[:role_name] || 'User'].to_json
          }.join("\n")

          importer = BulkUserImporter.new(
            content: content,
            current_user: current_user,
            provider: current_provider
          )

          validation = importer.parse_and_validate
          return render_error errors: [validation[:error]], status: :unprocessable_entity if validation[:error]

          valid_rows = validation[:results].select(&:valid).map do |r|
            { name: r.name, email: r.email, password: r.password, role_name: r.role_name }
          end

          return render_error errors: ['no_valid_rows'], status: :unprocessable_entity if valid_rows.empty?

          outcome = importer.import(valid_rows)

          render_data data: {
            created_count: outcome[:created].size,
            failed_count: outcome[:failed].size,
            created: outcome[:created],
            failed: outcome[:failed]
          }, status: :ok
        end

        # POST /api/v1/admin/bulk_users/preview_delete
        def preview_delete
          content = params[:content].to_s
          return render_error errors: ['empty'], status: :bad_request if content.blank?

          importer = BulkUserImporter.new(
            content: content,
            current_user: current_user,
            provider: current_provider
          )

          parsed = importer.parse_emails_for_delete
          return render_error errors: [parsed[:error]], status: :unprocessable_entity if parsed[:error]

          result = importer.preview_delete(parsed[:emails])

          render_data data: result, status: :ok
        end

        # POST /api/v1/admin/bulk_users/delete
        def delete
          user_ids = params[:user_ids]
          return render_error errors: ['empty'], status: :bad_request if user_ids.blank?

          importer = BulkUserImporter.new(
            content: '',
            current_user: current_user,
            provider: current_provider
          )

          outcome = importer.delete_users(user_ids)

          render_data data: {
            deleted_count: outcome[:deleted].size,
            failed_count: outcome[:failed].size,
            deleted: outcome[:deleted],
            failed: outcome[:failed]
          }, status: :ok
        end
      end
    end
  end
end
