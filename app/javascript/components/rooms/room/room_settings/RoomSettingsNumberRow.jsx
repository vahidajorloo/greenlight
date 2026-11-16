// Tehran Server – numeric room setting with enable toggle (RTL friendly)
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Form, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

export default function RoomSettingsNumberRow({
  settingName,
  config,
  value,
  description,
  updateMutation: useUpdateAPI,
  min = 1,
  max = 500,
  defaultWhenEnabled = 10,
}) {
  const { t } = useTranslation();
  const updateAPI = useUpdateAPI();

  const numericValue = parseInt(value, 10);
  const isEnabled = !Number.isNaN(numericValue) && numericValue > 0;

  const [enabled, setEnabled] = useState(isEnabled);
  const [inputValue, setInputValue] = useState(isEnabled ? numericValue : defaultWhenEnabled);

  useEffect(() => {
    const num = parseInt(value, 10);
    const en = !Number.isNaN(num) && num > 0;
    setEnabled(en);
    if (en) setInputValue(num);
  }, [value]);

  if (config === 'false') return null;

  const disabled = updateAPI.isLoading || config === 'true';

  const handleToggle = (checked) => {
    setEnabled(checked);
    const newValue = checked ? String(inputValue || defaultWhenEnabled) : '0';
    updateAPI.mutate({ settingName, settingValue: newValue });
  };

  const handleNumberChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleNumberBlur = () => {
    let num = parseInt(inputValue, 10);
    if (Number.isNaN(num) || num < min) num = min;
    if (num > max) num = max;
    setInputValue(num);
    if (enabled) {
      updateAPI.mutate({ settingName, settingValue: String(num) });
    }
  };

  return (
    <div className="room-settings-row text-muted py-2">
      {/* Label + Toggle on the same line */}
      <div className="d-flex align-items-center justify-content-between">
        <label className="form-check-label" htmlFor={`${settingName}-toggle`}>
          {description}
        </label>
        <div className="form-switch">
          <input
            className="form-check-input fs-5"
            type="checkbox"
            id={`${settingName}-toggle`}
            checked={enabled}
            disabled={disabled}
            onChange={(e) => handleToggle(e.target.checked)}
          />
        </div>
      </div>

      {/* Number input – only shown when enabled */}
      {enabled && (
        <div className="mt-2 d-flex justify-content-end">
          <InputGroup size="sm" style={{ maxWidth: 140 }}>
            <Form.Control
              type="number"
              min={min}
              max={max}
              value={inputValue}
              disabled={disabled}
              onChange={handleNumberChange}
              onBlur={handleNumberBlur}
              dir="ltr"
              className="text-center"
            />
          </InputGroup>
        </div>
      )}
    </div>
  );
}

RoomSettingsNumberRow.defaultProps = {
  value: '0',
  config: 'optional',
  min: 1,
  max: 500,
  defaultWhenEnabled: 10,
};

RoomSettingsNumberRow.propTypes = {
  settingName: PropTypes.string.isRequired,
  updateMutation: PropTypes.func.isRequired,
  value: PropTypes.string,
  config: PropTypes.string,
  description: PropTypes.string.isRequired,
  min: PropTypes.number,
  max: PropTypes.number,
  defaultWhenEnabled: PropTypes.number,
};
