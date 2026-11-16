// Tehran Server – multi-select row for the BigBlueButton "disabledFeatures" list
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Badge, Button, Collapse, Form,
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

// Feature names accepted by the "disabledFeatures" create parameter (valid in BBB 3.0 and 4.0)
const FEATURE_GROUPS = {
  chat: ['chat', 'privateChat', 'deleteChatMessage', 'editChatMessage', 'replyChatMessage', 'chatMessageReactions', 'chatEmojiPicker'],
  presentation: ['presentation', 'downloadPresentationWithAnnotations', 'downloadPresentationConvertedToPdf', 'downloadPresentationOriginalFile', 'snapshotOfCurrentSlide', 'infiniteWhiteboard'],
  breakout: ['breakoutRooms', 'importPresentationWithAnnotationsFromBreakoutRooms', 'importSharedNotesFromBreakoutRooms'],
  media: ['screenshare', 'cameraAsContent', 'virtualBackgrounds', 'customVirtualBackgrounds', 'liveTranscription'],
  engagement: ['polls', 'quizzes', 'raiseHand', 'userReactions', 'externalVideos', 'timer'],
  other: ['sharedNotes', 'learningDashboard', 'learningDashboardDownloadSessionData', 'plugins'],
};

const parseList = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);

export default function RoomSettingsFeaturesRow({
  settingName, config, value, description, updateMutation: useUpdateAPI,
}) {
  const { t } = useTranslation();
  const updateAPI = useUpdateAPI();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(parseList(value));

  useEffect(() => {
    setSelected(parseList(value));
  }, [value]);

  if (config === 'false') return null;

  const locked = config === 'true'; // forced by the administrator
  const disabled = updateAPI.isLoading || locked;
  const savedList = parseList(value);
  const dirty = [...selected].sort().join(',') !== [...savedList].sort().join(',');

  const toggle = (name, checked) => {
    setSelected((current) => (checked ? [...new Set([...current, name])] : current.filter((item) => item !== name)));
  };

  const handleSave = () => {
    updateAPI.mutate({ settingName, settingValue: selected.join(',') });
  };

  return (
    <div className="room-settings-row border border-primary rounded p-3 mt-3 bg-light">
      <div className="d-flex align-items-center flex-wrap gap-2">
        <span className="me-auto" style={{ minWidth: 0 }}>{description}</span>
        {savedList.length > 0 && (
          <Badge bg="secondary" pill className="me-2">{t('room.settings.features_count', { number: savedList.length })}</Badge>
        )}
        <Button variant="brand" size="sm" className="text-wrap fw-bold" style={{ whiteSpace: "normal", maxWidth: "100%" }} onClick={() => setOpen(!open)} aria-expanded={open}>
          {t('room.settings.choose_features')}
        </Button>
      </div>
      <Collapse in={open}>
        <div>
          <div className="mt-3" style={{ columnWidth: '15rem', columnGap: '1.5rem' }}>
            {Object.entries(FEATURE_GROUPS).map(([group, names]) => (
              <div key={group} className="mb-3" style={{ breakInside: 'avoid' }}>
                <div className="fw-bold small mt-3 mb-2 pb-2 border-bottom">{t(`room.settings.feature_groups.${group}`)}</div>
                {names.map((name) => (
                  <Form.Check
                    key={name}
                    type="checkbox"
                    id={`${settingName}-${name}`}
                    label={t(`room.settings.features.${name}`, { defaultValue: name })}
                    checked={selected.includes(name)}
                    disabled={disabled}
                    onChange={(e) => toggle(name, e.target.checked)}
                  />
                ))}
              </div>
            ))}
          </div>
          {!locked && (
            <div className="text-end">
              <Button variant="brand" size="sm" disabled={!dirty || disabled} onClick={handleSave}>
                {t('room.settings.save_features')}
              </Button>
            </div>
          )}
        </div>
      </Collapse>
    </div>
  );
}

RoomSettingsFeaturesRow.defaultProps = {
  value: '',
  config: 'optional',
};

RoomSettingsFeaturesRow.propTypes = {
  settingName: PropTypes.string.isRequired,
  updateMutation: PropTypes.func.isRequired,
  value: PropTypes.string,
  config: PropTypes.string,
  description: PropTypes.string.isRequired,
};
