// Tehran Server – Bulk User Import / Delete
import React, { useState, useRef } from 'react';
import {
  Card, Button, Form, Table, Badge, ProgressBar, Alert, Spinner, Nav,
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import axios from '../../../helpers/Axios';
import AdminNavSideBar from '../AdminNavSideBar';
import FilesDragAndDrop from '../../shared_components/utilities/FilesDragAndDrop';

export default function BulkUsers() {
  const { t } = useTranslation();
  const fileRef = useRef();
  const [mode, setMode] = useState('import'); // 'import' | 'delete'
  const [content, setContent] = useState('');
  const [rows, setRows] = useState(null);
  const [deletePreview, setDeletePreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const handleFile = (files) => {
    const file = files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setContent(e.target.result);
    reader.readAsText(file);
  };

  const resetState = () => {
    setRows(null);
    setDeletePreview(null);
    setResult(null);
    setProgress(0);
  };

  const changeMode = (newMode) => {
    setMode(newMode);
    resetState();
  };

  // ---------- IMPORT ----------
  const runPreview = async () => {
    if (!content.trim()) {
      toast.error(t('admin.bulk_users.empty_content'));
      return;
    }
    setLoadingPreview(true);
    setResult(null);
    try {
      const { data } = await axios.post('/admin/bulk_users/preview.json', { content });
      setRows(data.data.rows);
    } catch (err) {
      const msg = err?.response?.data?.errors?.[0];
      toast.error(msg === 'too_many_rows'
        ? t('admin.bulk_users.too_many_rows')
        : t('toast.error.problem_completing_action'));
    } finally {
      setLoadingPreview(false);
    }
  };

  const extractPassword = (email) => {
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      try {
        if (trimmed.startsWith('[')) {
          const arr = JSON.parse(trimmed);
          if (arr[1]?.toLowerCase() === email.toLowerCase()) return arr[2];
        } else {
          const cols = trimmed.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          if (cols[1]?.toLowerCase() === email.toLowerCase()) return cols[2];
        }
      } catch { /* ignore */ }
    }
    return '';
  };

  const runImport = async () => {
    const valid = rows.filter((r) => r.valid);
    if (!valid.length) {
      toast.error(t('admin.bulk_users.no_valid_rows'));
      return;
    }

    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      const { data } = await axios.post('/admin/bulk_users/import.json', {
        rows: valid.map((r) => ({
          name: r.name,
          email: r.email,
          password: extractPassword(r.email),
          role_name: r.role_name,
        })),
      });

      setResult(data.data);
      setProgress(100);
      toast.success(t('admin.bulk_users.import_success', { count: data.data.created_count }));
    } catch (err) {
      toast.error(t('toast.error.problem_completing_action'));
    } finally {
      setImporting(false);
    }
  };

  // ---------- DELETE ----------
  const runDeletePreview = async () => {
    if (!content.trim()) {
      toast.error(t('admin.bulk_users.empty_content'));
      return;
    }
    setLoadingPreview(true);
    setResult(null);
    try {
      const { data } = await axios.post('/admin/bulk_users/preview_delete.json', { content });
      setDeletePreview(data.data);
    } catch (err) {
      toast.error(t('toast.error.problem_completing_action'));
    } finally {
      setLoadingPreview(false);
    }
  };

  const runDelete = async () => {
    if (!deletePreview?.found?.length) {
      toast.error(t('admin.bulk_users.no_users_to_delete'));
      return;
    }

    if (!window.confirm(t('admin.bulk_users.confirm_delete', { count: deletePreview.found.length }))) {
      return;
    }

    setDeleting(true);
    setResult(null);

    try {
      const { data } = await axios.post('/admin/bulk_users/delete.json', {
        user_ids: deletePreview.found.map((u) => u.id),
      });

      setResult(data.data);
      toast.success(t('admin.bulk_users.delete_success', { count: data.data.deleted_count }));
      setDeletePreview(null);
    } catch (err) {
      toast.error(t('toast.error.problem_completing_action'));
    } finally {
      setDeleting(false);
    }
  };

  const validCount = rows ? rows.filter((r) => r.valid).length : 0;
  const invalidCount = rows ? rows.length - validCount : 0;

  return (
    <div id="admin-panel" className="pb-4">
      <h3 className="py-5">{t('admin.admin_panel')}</h3>
      <Card className="border-0 card-shadow">
        <Card.Body className="p-0">
          <div className="row p-4">
            <div className="col-md-3 pt-4">
              <AdminNavSideBar />
            </div>
            <div className="col-md-9 ps-5 pe-0 pe-md-4">
              <h4 className="mb-3">{t('admin.bulk_users.title')}</h4>

              {/* Mode tabs */}
              <Nav variant="pills" className="mb-4">
                <Nav.Item>
                  <Nav.Link
                    active={mode === 'import'}
                    onClick={() => changeMode('import')}
                    className="cursor-pointer"
                  >
                    {t('admin.bulk_users.tab_import')}
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link
                    active={mode === 'delete'}
                    onClick={() => changeMode('delete')}
                    className="cursor-pointer"
                  >
                    {t('admin.bulk_users.tab_delete')}
                  </Nav.Link>
                </Nav.Item>
              </Nav>

              <Alert variant="info" className="mb-4">
                {mode === 'import'
                  ? t('admin.bulk_users.help')
                  : t('admin.bulk_users.help_delete')}
              </Alert>

              {/* Upload / paste area */}
              <FilesDragAndDrop
                onDrop={handleFile}
                numOfFiles={1}
                formats={['.csv', '.txt', '.json']}
              >
                <div
                  className="border border-2 border-dashed rounded-3 p-4 text-center mb-3"
                  style={{ background: 'var(--ts-input-bg)', cursor: 'pointer' }}
                  onClick={() => fileRef.current?.click()}
                >
                  <p className="mb-1 fw-medium">{t('admin.bulk_users.drop_or_click')}</p>
                  <p className="text-muted small mb-0">{t('admin.bulk_users.accepted_formats')}</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.txt,.json"
                    className="d-none"
                    onChange={(e) => handleFile(e.target.files)}
                  />
                </div>
              </FilesDragAndDrop>

              <Form.Group className="mb-3">
                <Form.Label>{t('admin.bulk_users.or_paste')}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={mode === 'import'
                    ? '["Admin","admin@example.com","Rgrwe3@hg","Administrator"]\nteacher-user,teacher@example.com,grhtHR32@hg,User'
                    : 'admin@example.com\nteacher@example.com\n["Any Name","student@example.com"]'}
                  dir="ltr"
                />
              </Form.Group>

              <div className="d-flex gap-2 mb-4">
                {mode === 'import' ? (
                  <Button
                    variant="brand"
                    onClick={runPreview}
                    disabled={loadingPreview || !content.trim()}
                  >
                    {loadingPreview ? <Spinner size="sm" /> : t('admin.bulk_users.preview')}
                  </Button>
                ) : (
                  <Button
                    variant="brand"
                    onClick={runDeletePreview}
                    disabled={loadingPreview || !content.trim()}
                  >
                    {loadingPreview ? <Spinner size="sm" /> : t('admin.bulk_users.preview_delete')}
                  </Button>
                )}
              </div>

              {/* IMPORT preview table */}
              {mode === 'import' && rows && (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <Badge bg="success" className="me-2">{validCount} {t('admin.bulk_users.valid')}</Badge>
                      <Badge bg="danger">{invalidCount} {t('admin.bulk_users.invalid')}</Badge>
                    </div>
                    <Button
                      variant="brand"
                      disabled={validCount === 0 || importing}
                      onClick={runImport}
                    >
                      {importing ? <Spinner size="sm" /> : t('admin.bulk_users.import_valid', { count: validCount })}
                    </Button>
                  </div>

                  {importing && <ProgressBar now={progress} className="mb-3" animated />}

                  <div className="table-responsive">
                    <Table hover size="sm" className="align-middle">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>{t('admin.bulk_users.col_name')}</th>
                          <th>{t('admin.bulk_users.col_email')}</th>
                          <th>{t('admin.bulk_users.col_role')}</th>
                          <th>{t('admin.bulk_users.col_status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.row} className={r.valid ? '' : 'table-danger'}>
                            <td>{r.row}</td>
                            <td>{r.name}</td>
                            <td dir="ltr">{r.email}</td>
                            <td>{r.role_name}</td>
                            <td>
                              {r.valid ? (
                                <Badge bg="success">{t('admin.bulk_users.valid')}</Badge>
                              ) : (
                                <span className="text-danger small">
                                  {r.errors.map((e) => t(`admin.bulk_users.errors.${e}`)).join(', ')}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </>
              )}

              {/* DELETE preview table */}
              {mode === 'delete' && deletePreview && (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <Badge bg="danger" className="me-2">
                        {deletePreview.found.length} {t('admin.bulk_users.will_be_deleted')}
                      </Badge>
                      {deletePreview.not_found.length > 0 && (
                        <Badge bg="secondary">
                          {deletePreview.not_found.length} {t('admin.bulk_users.not_found')}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="danger"
                      disabled={deletePreview.found.length === 0 || deleting}
                      onClick={runDelete}
                    >
                      {deleting ? <Spinner size="sm" /> : t('admin.bulk_users.delete_selected', { count: deletePreview.found.length })}
                    </Button>
                  </div>

                  {deletePreview.found.length > 0 && (
                    <div className="table-responsive mb-3">
                      <Table hover size="sm" className="align-middle">
                        <thead>
                          <tr>
                            <th>{t('admin.bulk_users.col_name')}</th>
                            <th>{t('admin.bulk_users.col_email')}</th>
                            <th>{t('admin.bulk_users.col_role')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deletePreview.found.map((u) => (
                            <tr key={u.id}>
                              <td>{u.name}</td>
                              <td dir="ltr">{u.email}</td>
                              <td>{u.role}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}

                  {deletePreview.not_found.length > 0 && (
                    <Alert variant="warning">
                      <strong>{t('admin.bulk_users.emails_not_found')}:</strong>
                      <div dir="ltr" className="small mt-1">
                        {deletePreview.not_found.join(', ')}
                      </div>
                    </Alert>
                  )}
                </>
              )}

              {/* Result summary */}
              {result && (
                <Alert variant={result.deleted_count !== undefined ? 'warning' : 'success'} className="mt-4">
                  <strong>
                    {result.deleted_count !== undefined
                      ? t('admin.bulk_users.delete_done')
                      : t('admin.bulk_users.done')}
                  </strong>
                  <br />
                  {result.created_count !== undefined && (
                    t('admin.bulk_users.created_count', { count: result.created_count })
                  )}
                  {result.deleted_count !== undefined && (
                    t('admin.bulk_users.deleted_count', { count: result.deleted_count })
                  )}
                  {(result.failed_count > 0) && (
                    <>
                      <br />
                      {t('admin.bulk_users.failed_count', { count: result.failed_count })}
                    </>
                  )}
                </Alert>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
