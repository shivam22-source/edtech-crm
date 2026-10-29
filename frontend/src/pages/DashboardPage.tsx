import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiError, fetchInquiries, updateStatus, type InquiryList } from '../lib/api';
import { CATEGORIES, STATUSES, USER_TYPES, labelFor, type Status } from '../lib/constants';

const PAGE_SIZE = 20;
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function DashboardPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? '';
  const userType = params.get('userType') ?? '';
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [search, setSearch] = useState(q);
  const [result, setResult] = useState<InquiryList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [reloadKey, setReloadKey] = useState(0);

  function updateParams(changes: Record<string, string>) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value === '') next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = search.trim();
      if (trimmed !== q) updateParams({ q: trimmed, page: '' });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams();
    if (category) query.set('category', category);
    if (userType) query.set('userType', userType);
    if (q) query.set('q', q);
    query.set('page', String(page));
    query.set('limit', String(PAGE_SIZE));

    setLoading(true);
    setError('');
    fetchInquiries(query, controller.signal).then(
      (data) => {
        setResult(data);
        setLoading(false);
      },
      (failure: unknown) => {
        if (controller.signal.aborted) return;
        setError(failure instanceof ApiError ? failure.message : 'Could not load inquiries.');
        setLoading(false);
      },
    );
    return () => controller.abort();
  }, [category, userType, q, page, reloadKey]);

  async function changeStatus(id: string, status: Status) {
    setRowErrors((current) => ({ ...current, [id]: '' }));
    try {
      const updated = await updateStatus(id, status);
      setResult((current) =>
        current ? { ...current, data: current.data.map((row) => (row.id === id ? { ...row, ...updated } : row)) } : current,
      );
    } catch (failure) {
      const message = failure instanceof ApiError ? failure.message : 'Could not save the status.';
      setRowErrors((current) => ({ ...current, [id]: message }));
    }
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1;

  return (
    <section className="page wide" aria-labelledby="dash-heading">
      <h1 id="dash-heading">Inquiries</h1>

      <div className="filters">
        <div className="field">
          <label htmlFor="filter-category">Category</label>
          <select id="filter-category" value={category} onChange={(e) => updateParams({ category: e.target.value, page: '' })}>
            <option value="">All categories</option>
            {CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-user-type">User type</label>
          <select id="filter-user-type" value={userType} onChange={(e) => updateParams({ userType: e.target.value, page: '' })}>
            <option value="">All user types</option>
            {USER_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field grow">
          <label htmlFor="filter-search">Search by name or phone</label>
          <input id="filter-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {error ? (
        <div role="alert" className="state-box">
          <p>{error}</p>
          <button type="button" className="button secondary" onClick={() => setReloadKey((key) => key + 1)}>
            Try again
          </button>
        </div>
      ) : null}

      {!error && loading && !result ? <p className="page-note">Loading inquiries.</p> : null}

      {!error && result ? (
        <>
          <p className="result-count" aria-live="polite">
            {loading ? 'Loading inquiries.' : `${result.total} ${result.total === 1 ? 'inquiry' : 'inquiries'}`}
          </p>
          {result.data.length === 0 && !loading ? (
            <p className="state-box">No inquiries match these filters.</p>
          ) : (
            <div className="table-scroll" tabIndex={0} role="region" aria-label="Inquiries table">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Phone</th>
                    <th scope="col">Email</th>
                    <th scope="col">User Type</th>
                    <th scope="col">Category</th>
                    <th scope="col">Date</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((row) => (
                    <tr key={row.id}>
                      <th scope="row">{row.name}</th>
                      <td>{row.phone}</td>
                      <td>{row.email}</td>
                      <td>{labelFor(USER_TYPES, row.userType)}</td>
                      <td>{labelFor(CATEGORIES, row.category)}</td>
                      <td>{dateFormat.format(new Date(row.createdAt))}</td>
                      <td>
                        <span className={`dot dot-${row.status}`} aria-hidden="true" />
                        <select
                          aria-label={`Status for ${row.name}`}
                          value={row.status}
                          onChange={(e) => void changeStatus(row.id, e.target.value as Status)}
                        >
                          {STATUSES.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {rowErrors[row.id] ? <p className="field-error">{rowErrors[row.id]}</p> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <nav className="pagination" aria-label="Pagination">
            <button type="button" className="button secondary" disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) })}>
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="button secondary"
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              Next
            </button>
          </nav>
        </>
      ) : null}
    </section>
  );
}
