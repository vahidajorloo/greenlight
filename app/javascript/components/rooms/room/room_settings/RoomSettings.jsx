// BigBlueButton open source conferencing system - http://www.bigbluebutton.org/.
//
// Copyright (c) 2022 BigBlueButton Inc. and by respective authors (see below).
//
// This program is free software; you can redistribute it and/or modify it under the
// terms of the GNU Lesser General Public License as published by the Free Software
// Foundation; either version 3.0 of the License, or (at your option) any later
// version.
//
// Greenlight is distributed in the hope that it will be useful, but WITHOUT ANY
// WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
// PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License along
// with Greenlight; if not, see <http://www.gnu.org/licenses/>.

import React from 'react';
import {
  Row, Col, Button, Stack,
} from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import { useTranslation } from 'react-i18next';
import useRoomSettings from '../../../../hooks/queries/rooms/useRoomSettings';
import useDeleteRoom from '../../../../hooks/mutations/rooms/useDeleteRoom';
import RoomSettingsRow from './RoomSettingsRow';
import Modal from '../../../shared_components/modals/Modal';
import DeleteRoomForm from '../forms/DeleteRoomForm';
import useRoomConfigs from '../../../../hooks/queries/rooms/useRoomConfigs';
import AccessCodeRow from './AccessCodeRow';
import useUpdateRoomSetting from '../../../../hooks/mutations/room_settings/useUpdateRoomSetting';
import { useAuth } from '../../../../contexts/auth/AuthProvider';
import UpdateRoomNameForm from './forms/UpdateRoomNameForm';
import useRoom from '../../../../hooks/queries/rooms/useRoom';
import UnshareRoom from './UnshareRoom';
import useServerTags from '../../../../hooks/queries/rooms/useServerTags';
import useServerTagsFallbackMode from '../../../../hooks/queries/rooms/useServerTagsFallbackMode';
import ServerTagRow from './ServerTagRow';
import RoomSettingsNumberRow from './RoomSettingsNumberRow';
import RoomSettingsFeaturesRow from './RoomSettingsFeaturesRow';

export default function RoomSettings() {
  const { t } = useTranslation();
  const currentUser = useAuth();
  const { friendlyId } = useParams();
  const roomSetting = useRoomSettings(friendlyId);
  const { data: roomConfigs } = useRoomConfigs();
  const { data: room } = useRoom(friendlyId);
  const { data: serverTags } = useServerTags(friendlyId);
  const { data: serverTagsFallbackMode } = useServerTagsFallbackMode();

  const updateMutationWrapper = () => useUpdateRoomSetting(friendlyId);
  const deleteMutationWrapper = (args) => useDeleteRoom({ friendlyId, ...args });

  return (
    <div id="room-settings" className="pt-3">
      <Card className="mx-auto p-4 border-0 card-shadow">
        <div className="mt-2">
          <Row>
            <Col className="border-end border-2">
              <UpdateRoomNameForm friendlyId={friendlyId} />
              <AccessCodeRow
                settingName="glViewerAccessCode"
                updateMutation={updateMutationWrapper}
                code={roomSetting?.data?.glViewerAccessCode}
                config={roomConfigs?.glViewerAccessCode}
                description={t('room.settings.generate_viewers_access_code')}
              />
              <AccessCodeRow
                settingName="glModeratorAccessCode"
                updateMutation={updateMutationWrapper}
                code={roomSetting?.data?.glModeratorAccessCode}
                config={roomConfigs?.glModeratorAccessCode}
                description={t('room.settings.generate_mods_access_code')}
              />
              {serverTags && Object.keys(serverTags).length !== 0 && (
                <ServerTagRow
                  updateMutation={updateMutationWrapper}
                  currentTag={roomSetting?.data?.serverTag}
                  tagRequired={roomSetting?.data?.serverTagRequired === 'true'}
                  serverTags={serverTags}
                  fallbackMode={serverTagsFallbackMode}
                  description={t('room.settings.server_tag')}
                />
              )}
            </Col>
            <Col className="ps-4">
              <Row> <h6 className="text-brand">{ t('room.settings.user_settings') }</h6> </Row>
              {(currentUser?.permissions?.CanRecord === 'true') && (
                <RoomSettingsRow
                  settingName="record"
                  updateMutation={updateMutationWrapper}
                  value={roomSetting?.data?.record}
                  config={roomConfigs?.record}
                  description={t('room.settings.allow_room_to_be_recorded')}
                />
              )}
              <RoomSettingsRow
                settingName="glRequireAuthentication"
                updateMutation={updateMutationWrapper}
                value={roomSetting?.data?.glRequireAuthentication}
                config={roomConfigs?.glRequireAuthentication}
                description={t('room.settings.require_signed_in')}
              />

              <RoomSettingsRow
                settingName="guestPolicy"
                updateMutation={updateMutationWrapper}
                value={roomSetting?.data?.guestPolicy}
                config={roomConfigs?.guestPolicy}
                description={t('room.settings.require_mod_approval')}
                disabled={roomSetting?.data?.glAnyoneJoinAsModerator === 'true'}
              />

              <RoomSettingsRow
                settingName="glAnyoneCanStart"
                updateMutation={updateMutationWrapper}
                value={roomSetting?.data?.glAnyoneCanStart}
                config={roomConfigs?.glAnyoneCanStart}
                description={t('room.settings.allow_any_user_to_start')}
              />
              <RoomSettingsRow
                settingName="glAnyoneJoinAsModerator"
                updateMutation={updateMutationWrapper}
                value={roomSetting?.data?.glAnyoneJoinAsModerator}
                config={roomConfigs?.glAnyoneJoinAsModerator}
                description={t('room.settings.all_users_join_as_mods')}
              />
              <RoomSettingsRow
                settingName="muteOnStart"
                updateMutation={updateMutationWrapper}
                value={roomSetting?.data?.muteOnStart}
                config={roomConfigs?.muteOnStart}
                description={t('room.settings.mute_users_on_join')}
              />

              <RoomSettingsRow
                settingName="webcamsOnlyForModerator"
                updateMutation={updateMutationWrapper}
                value={roomSetting?.data?.webcamsOnlyForModerator}
                config={roomConfigs?.webcamsOnlyForModerator}
                description={t('room.settings.webcams_only_for_moderator')}
              />

              <RoomSettingsNumberRow
                settingName="meetingCameraCap"
                updateMutation={updateMutationWrapper}
                value={roomSetting?.data?.meetingCameraCap}
                config={roomConfigs?.meetingCameraCap}
                description={t('room.settings.meeting_camera_cap')}
                min={1}
                max={100}
                defaultWhenEnabled={10}
              />

              <RoomSettingsNumberRow
                settingName="userCameraCap"
                updateMutation={updateMutationWrapper}
                value={roomSetting?.data?.userCameraCap}
                config={roomConfigs?.userCameraCap}
                description={t('room.settings.user_camera_cap')}
                min={1}
                max={10}
                defaultWhenEnabled={3}
              />

              <RoomSettingsNumberRow
                settingName="maxParticipants"
                updateMutation={updateMutationWrapper}
                value={roomSetting?.data?.maxParticipants}
                config={roomConfigs?.maxParticipants}
                description={t('room.settings.max_participants')}
                min={2}
                max={500}
                defaultWhenEnabled={50}
              />


              <RoomSettingsNumberRow
                settingName="duration"
                updateMutation={updateMutationWrapper}
                value={roomSetting?.data?.duration}
                config={roomConfigs?.duration}
                description={t('room.settings.duration', { defaultValue: 'Meeting duration (minutes)' })}
                min={1}
                max={1440}
                defaultWhenEnabled={60}
              />

              {[
                ['lockSettingsDisableCam', 'lock_settings_disable_cam'],
                ['lockSettingsDisableMic', 'lock_settings_disable_mic'],
                ['lockSettingsDisablePrivateChat', 'lock_settings_disable_private_chat'],
                ['lockSettingsDisablePublicChat', 'lock_settings_disable_public_chat'],
                ['lockSettingsDisableNotes', 'lock_settings_disable_notes'],
              ].map(([name, translationKey]) => (
                <RoomSettingsRow
                  key={name}
                  settingName={name}
                  updateMutation={updateMutationWrapper}
                  value={roomSetting?.data?.[name]}
                  config={roomConfigs?.[name]}
                  description={t(`room.settings.${translationKey}`)}
                />
              ))}

              <RoomSettingsFeaturesRow
                settingName="disabledFeatures"
                updateMutation={updateMutationWrapper}
                value={roomSetting?.data?.disabledFeatures}
                config={roomConfigs?.disabledFeatures}
                description={t('room.settings.disabled_features', { defaultValue: 'Disabled meeting features' })}
              />



              <div className="float-end mt-3">
                <Stack direction="horizontal" gap={2}>
                  {
                    room.shared
                      && (
                        <Modal
                          modalButton={(
                            <Button
                              variant="delete"
                              className="mt-1 mx-2 float-end"
                            >{t('room.shared_access.delete_shared_access')}
                            </Button>
                          )}
                          body={<UnshareRoom userId={currentUser.id} roomFriendlyId={friendlyId} />}
                        />
                      )
                  }
                  {
                    (!room.shared || currentUser?.permissions?.ManageRooms === 'true')
                      && (
                        <Modal
                          modalButton={(
                            <Button
                              variant="delete"
                              className="mt-1 mx-2 float-end"
                            >{t('room.delete_room')}
                            </Button>
                          )}
                          body={<DeleteRoomForm mutation={deleteMutationWrapper} />}
                        />
                      )
                  }
                </Stack>
              </div>
            </Col>
          </Row>
        </div>
      </Card>
    </div>
  );
}
