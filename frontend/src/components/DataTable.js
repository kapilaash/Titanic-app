// components/DataTable.js
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPassengerData } from '../api/queries';
import { markExplorationTask } from '../utils/explorationProgress';
import { MiniMetricSkeleton, TableLoadingPanel, LoadingText } from './common/DataState';

const ITEMS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 360;
const TATE_STATE_EVENT = 'titanic-tate-state';

const preferredOrder = [
  'PassengerId',
  'Name',
  'Title',
  'Sex',
  'Age',
  'Pclass',
  'Ticket',
  'Cabin',
  'Embarked',
  'Fare',
  'SibSp',
  'Parch',
  'FamilySize',
  'IsAlone',
  'Survived',
];

const columnLabels = {
  PassengerId: 'ID',
  Pclass: 'Class',
  SibSp: 'SibSp',
  Parch: 'Parch',
  FamilySize: 'Family',
  IsAlone: 'Alone',
  Fare: 'Fare',
  Survived: 'Outcome',
};

const sortableColumns = new Set(preferredOrder);

const columnClassMap = {
  PassengerId: 'w-[4.25rem] min-w-[4.25rem]',
  Name: 'w-[24rem] min-w-[24rem]',
  Title: 'w-[7rem] min-w-[7rem]',
  Sex: 'w-[7rem] min-w-[7rem]',
  Age: 'w-[7rem] min-w-[7rem]',
  Pclass: 'w-[6rem] min-w-[6rem]',
  Ticket: 'w-[12rem] min-w-[12rem]',
  Cabin: 'w-[9rem] min-w-[9rem]',
  Embarked: 'w-[8rem] min-w-[8rem]',
  Fare: 'w-[8rem] min-w-[8rem]',
  SibSp: 'w-[7rem] min-w-[7rem]',
  Parch: 'w-[7rem] min-w-[7rem]',
  FamilySize: 'w-[7rem] min-w-[7rem]',
  IsAlone: 'w-[7rem] min-w-[7rem]',
  Survived: 'w-[10rem] min-w-[10rem]',
};

const getOutcomeLabel = (value) => (Number(value) === 1 ? 'Survived' : 'Perished');

const formatScalar = (value, key) => {
  if (value === null || value === undefined || value === '') return 'Unknown';

  if (key === 'Fare') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? `$${numeric.toFixed(2)}` : 'Unknown';
  }

  if (key === 'Age') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? `${Math.round(numeric)} yrs` : 'Unknown';
  }

  if (key === 'IsAlone') return Number(value) === 1 ? 'Yes' : 'No';
  if (key === 'Survived') return getOutcomeLabel(value);

  return String(value);
};

const OutcomePill = ({ value }) => {
  const survived = Number(value) === 1;
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
      survived
        ? 'border-emerald-200/25 bg-emerald-300/10 text-emerald-100'
        : 'border-rose-200/25 bg-rose-400/10 text-rose-100'
    }`}>
      {survived ? 'Survived' : 'Perished'}
    </span>
  );
};

const DataTable = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedRow, setSelectedRow] = useState(null);
  const [isTateOpen, setIsTateOpen] = useState(false);

  useEffect(() => {
    const handleTateState = (event) => {
      setIsTateOpen(Boolean(event.detail?.isOpen));
    };

    setIsTateOpen(document.documentElement.classList.contains('tate-panel-open'));
    window.addEventListener(TATE_STATE_EVENT, handleTateState);
    return () => window.removeEventListener(TATE_STATE_EVENT, handleTateState);
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timerId);
  }, [searchTerm]);

  const {
    data: passengerResponse,
    isLoading,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ['passenger-data', currentPage, debouncedSearchTerm, sortConfig.key, sortConfig.direction],
    queryFn: () => fetchPassengerData({
      page: currentPage,
      perPage: ITEMS_PER_PAGE,
      search: debouncedSearchTerm,
      sortBy: sortConfig.key,
      sortDir: sortConfig.direction,
    }),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 20,
  });

  const data = Array.isArray(passengerResponse?.data) ? passengerResponse.data : [];
  const hasPassengerResponse = Boolean(passengerResponse);
  const totalRecords = Number.isFinite(Number(passengerResponse?.total_records)) ? Number(passengerResponse.total_records) : null;
  const resolvedTotalRecords = totalRecords ?? 0;
  const totalPages = Number(passengerResponse?.total_pages || Math.max(1, Math.ceil(resolvedTotalRecords / ITEMS_PER_PAGE)));
  const searchEngine = passengerResponse?.search_meta?.engine || (debouncedSearchTerm ? 'backend' : 'all records');
  const loading = isLoading || isFetching;
  const isFirstLoad = isLoading && !hasPassengerResponse;
  const isSearchActive = searchTerm.trim().length > 0;
  const isDebouncing = searchTerm.trim() !== debouncedSearchTerm;

  useEffect(() => {
    if (passengerResponse?.page && Number(passengerResponse.page) !== currentPage) {
      setCurrentPage(Number(passengerResponse.page));
    }
  }, [currentPage, passengerResponse?.page]);

  const columns = useMemo(() => {
    if (!data.length) return preferredOrder;
    return preferredOrder.filter((column) => Object.prototype.hasOwnProperty.call(data[0], column));
  }, [data]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = [1];
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    if (startPage > 2) pages.push('ellipsis-start');
    for (let page = startPage; page <= endPage; page += 1) pages.push(page);
    if (endPage < totalPages - 1) pages.push('ellipsis-end');
    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  const startRecord = resolvedTotalRecords === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endRecord = Math.min(currentPage * ITEMS_PER_PAGE, resolvedTotalRecords);

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    setCurrentPage(1);
    setSelectedRow(null);

    if (value.trim().length > 0) {
      markExplorationTask('passengerSearchUsed');
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setCurrentPage(1);
    setSelectedRow(null);
  };

  const runAlenSearchDemo = () => {
    setSearchTerm('alen');
    setCurrentPage(1);
    setSelectedRow(null);
    markExplorationTask('passengerSearchUsed');
  };

  const handleSort = (key) => {
    if (!sortableColumns.has(key)) return;

    setCurrentPage(1);
    setSelectedRow(null);
    markExplorationTask('dataSorted');

    setSortConfig((previous) => {
      if (previous.key === key && previous.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    setSelectedRow(null);
  };

  const selectedPassenger = selectedRow || data[0] || null;
  const workspaceClassName = isTateOpen
    ? 'grid gap-0 transition-[padding] duration-300 2xl:grid-cols-[1fr] 2xl:pr-[25rem]'
    : 'grid gap-0 xl:grid-cols-[minmax(0,1fr)_24rem]';

  if (isError) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 p-6 text-rose-100">
          <h3 className="font-black">Unable to load passenger data</h3>
          <p className="mt-2 text-sm text-rose-100/80">Please confirm the backend connection and data endpoint.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={workspaceClassName}>
      <div className="min-w-0 border-white/10 xl:border-r">
        <div className="border-b border-white/10 p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <label htmlFor="passenger-search" className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200">
                Search passenger universe
              </label>
              <div className="mt-3 flex items-center gap-3 rounded-[1.35rem] border border-white/10 bg-slate-950/60 px-4 py-3 shadow-inner">
                <span className="text-slate-500">⌕</span>
                <input
                  id="passenger-search"
                  type="search"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Try “alen” to see typo-tolerant passenger search..."
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white placeholder:text-slate-600 focus:outline-none"
                />
                {isSearchActive && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-black text-slate-300 transition hover:bg-white/[0.1] hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[32rem]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                {isFirstLoad ? (
                  <MiniMetricSkeleton label="records" />
                ) : (
                  <>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Records</div>
                    <div className="mt-1 text-xl font-black text-white">{totalRecords === null ? '—' : totalRecords.toLocaleString('en-US')}</div>
                  </>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                {isFirstLoad ? (
                  <MiniMetricSkeleton label="page" />
                ) : (
                  <>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Page</div>
                    <div className="mt-1 text-xl font-black text-white">{currentPage}/{totalPages}</div>
                  </>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                {isFirstLoad ? (
                  <MiniMetricSkeleton label="engine" />
                ) : (
                  <>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Engine</div>
                    <div className="mt-1 truncate text-sm font-black capitalize text-white">{searchEngine.replace(/_/g, ' ')}</div>
                  </>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                {isFirstLoad ? (
                  <MiniMetricSkeleton label="query" />
                ) : (
                  <>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Query</div>
                    <div className="mt-1 truncate text-sm font-black text-white">{debouncedSearchTerm || 'All records'}</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {(loading || isDebouncing) && (
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full w-1/2 animate-[shimmer-line_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
            </div>
          )}

          <div className="mt-5 overflow-hidden rounded-[1.35rem] border border-emerald-200/15 bg-gradient-to-r from-emerald-300/[0.08] via-cyan-300/[0.045] to-white/[0.035] p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">
                    Intelligent Search Demo
                  </span>
                  <span className="rounded-full border border-cyan-200/15 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
                    Meilisearch powered
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-black tracking-[-0.035em] text-white">
                  Try a misspelled name and watch retrieval still find the right passengers.
                </h3>
                <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-400">
                  Type <span className="font-black text-emerald-100">alen</span>. The backend search layer can return close passenger matches such as Allen, helping users understand that this is not a simple browser table filter.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row xl:shrink-0">
                <button
                  type="button"
                  onClick={runAlenSearchDemo}
                  className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-white/10 transition hover:-translate-y-0.5 hover:bg-emerald-50"
                >
                  Try “alen” search →
                </button>
                {isSearchActive && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.1] hover:text-white"
                  >
                    Reset search
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden overflow-x-auto mobile-scroll lg:block">
          <table className="min-w-[1180px] table-fixed divide-y divide-white/10 text-left">
            <thead className="bg-white/[0.035]">
              <tr>
                {columns.map((column) => {
                  const isSorted = sortConfig.key === column;
                  return (
                    <th key={column} scope="col" className={`${columnClassMap[column] || 'w-[8rem] min-w-[8rem]'} whitespace-nowrap px-4 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500`}>
                      <button
                        type="button"
                        onClick={() => handleSort(column)}
                        disabled={!sortableColumns.has(column)}
                        className="inline-flex items-center gap-2 rounded-lg transition hover:text-white disabled:cursor-default disabled:hover:text-slate-500"
                      >
                        {columnLabels[column] || column}
                        <span className={isSorted ? 'text-cyan-200' : 'text-slate-700'}>
                          {isSorted ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {isFirstLoad ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8">
                    <TableLoadingPanel columns={6} rows={7} />
                  </td>
                </tr>
              ) : data.length > 0 ? data.map((row) => {
                const isSelected = selectedRow?.PassengerId === row.PassengerId;
                return (
                  <tr
                    key={row.PassengerId || row.Name}
                    onClick={() => setSelectedRow(row)}
                    className={`cursor-pointer transition ${isSelected ? 'bg-cyan-300/[0.08]' : 'hover:bg-white/[0.045]'}`}
                  >
                    {columns.map((column) => (
                      <td key={`${row.PassengerId}-${column}`} className={`${columnClassMap[column] || 'w-[8rem] min-w-[8rem]'} px-4 py-4 align-middle text-sm text-slate-300`}>
                        {column === 'Survived' ? (
                          <OutcomePill value={row[column]} />
                        ) : (
                          <div className={`${column === 'Name' ? 'font-black text-white' : 'font-semibold'} truncate`} title={formatScalar(row[column], column)}>
                            {formatScalar(row[column], column)}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16 text-center text-slate-500">
                    <div className="text-lg font-black text-white">No passengers found</div>
                    <p className="mt-2 text-sm">Try a different name, ticket, cabin, or passenger ID.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 lg:hidden">
          {isFirstLoad ? (
            <TableLoadingPanel columns={2} rows={6} />
          ) : data.length > 0 ? data.map((row) => (
            <button
              key={row.PassengerId || row.Name}
              type="button"
              onClick={() => setSelectedRow(row)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-left transition hover:bg-white/[0.08]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-black text-white">{formatScalar(row.Name, 'Name')}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">ID {row.PassengerId} • Class {row.Pclass} • {formatScalar(row.Age, 'Age')}</div>
                </div>
                <OutcomePill value={row.Survived} />
              </div>
            </button>
          )) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-6 text-center text-slate-500">No passengers found.</div>
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-semibold text-slate-500">
            {isFirstLoad ? (
              <LoadingText>Preparing passenger table…</LoadingText>
            ) : (
              <>
                Showing <span className="text-slate-200">{startRecord}</span>–<span className="text-slate-200">{endRecord}</span> of <span className="text-slate-200">{totalRecords === null ? '—' : totalRecords.toLocaleString('en-US')}</span>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-black text-slate-300 transition hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            {pageNumbers.map((page) => (
              typeof page === 'number' ? (
                <button
                  key={page}
                  type="button"
                  onClick={() => handlePageChange(page)}
                  className={`h-9 min-w-9 rounded-xl px-3 text-xs font-black transition ${page === currentPage ? 'bg-white text-slate-950' : 'border border-white/10 bg-white/[0.045] text-slate-300 hover:bg-white/[0.09]'}`}
                >
                  {page}
                </button>
              ) : (
                <span key={page} className="px-1 text-slate-600">…</span>
              )
            ))}

            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-black text-slate-300 transition hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <aside className={`${isTateOpen ? 'hidden' : 'hidden xl:block'} p-5`}>
        <div className="sticky top-28 rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5">
          <p className="kicker text-emerald-200">Selected Passenger</p>
          {selectedPassenger ? (
            <div className="mt-5">
              <h3 className="break-words text-2xl font-black tracking-[-0.05em] text-white">{formatScalar(selectedPassenger.Name, 'Name')}</h3>
              <div className="mt-3"><OutcomePill value={selectedPassenger.Survived} /></div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                {['PassengerId', 'Sex', 'Age', 'Pclass', 'Fare', 'Embarked', 'Ticket', 'Cabin'].map((key) => (
                  <div key={key} className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">{columnLabels[key] || key}</div>
                    <div className="mt-1 truncate font-black text-slate-200" title={formatScalar(selectedPassenger[key], key)}>{formatScalar(selectedPassenger[key], key)}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-slate-500">Select a row to inspect passenger details.</p>
          )}
        </div>
      </aside>
    </div>
  );
};

export default DataTable;
