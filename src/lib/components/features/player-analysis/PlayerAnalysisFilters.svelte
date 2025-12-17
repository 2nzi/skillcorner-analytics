<script lang="ts">
  import NotchedBox from '$lib/components/ui/NotchedBox.svelte';

  export interface TimeWindow {
    id: 'current_week' | 'current_month' | 'current_season';
    label: string;
    value: string; // Editable value (e.g., "Week 15", "January 2025", "2024/25")
  }

  export interface FilterState {
    selectedClubs: string[];
    timeWindows: TimeWindow[];
  }

  interface Props {
    availableClubs?: string[];
    onFilterChange?: (filters: FilterState) => void;
    isOpen?: boolean;
    onToggle?: () => void;
  }

  let {
    availableClubs = [],
    onFilterChange,
    isOpen = false,
    onToggle
  }: Props = $props();

  // Helper functions to generate options
  function getWeekOptions(): string[] {
    const weeks = [];
    for (let i = 1; i <= 52; i++) {
      weeks.push(`Week ${i}`);
    }
    return weeks;
  }

  function getMonthOptions(): string[] {
    const months = [];
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 1; year <= currentYear; year++) {
      for (let month = 0; month < 12; month++) {
        const date = new Date(year, month);
        months.push(date.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
      }
    }
    return months;
  }

  function getYearOptions(): string[] {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear - 5; year <= currentYear; year++) {
      years.push(year.toString());
    }
    return years;
  }

  function getCurrentWeek(): string {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    const weekNumber = Math.ceil(diff / oneWeek);
    return `Week ${weekNumber}`;
  }

  function getCurrentMonth(): string {
    const now = new Date();
    return now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  function getCurrentYear(): string {
    return new Date().getFullYear().toString();
  }

  // Filter state - editable time windows with options
  let selectedClubs = $state<string[]>([]);
  let timeWindows = $state<TimeWindow[]>([
    { id: 'current_week', label: 'Week', value: getCurrentWeek() },
    { id: 'current_month', label: 'Month', value: getCurrentMonth() },
    { id: 'current_season', label: 'Year', value: getCurrentYear() }
  ]);

  // Options for each time window type
  const weekOptions = getWeekOptions();
  const monthOptions = getMonthOptions();
  const yearOptions = getYearOptions();

  // Notify parent of filter changes
  $effect(() => {
    if (onFilterChange) {
      onFilterChange({
        selectedClubs,
        timeWindows
      });
    }
  });

  function toggleClub(club: string) {
    if (selectedClubs.includes(club)) {
      selectedClubs = selectedClubs.filter(c => c !== club);
    } else {
      selectedClubs = [...selectedClubs, club];
    }
  }

  function clearAllClubs() {
    selectedClubs = [];
  }

  function selectAllClubs() {
    selectedClubs = [...availableClubs];
  }

  function updateTimeWindow(id: TimeWindow['id'], newValue: string) {
    timeWindows = timeWindows.map(tw =>
      tw.id === id ? { ...tw, value: newValue } : tw
    );
  }
</script>

{#if isOpen}
  <div class="filters-container">
    <NotchedBox
      backgroundColor="var(--color-bg-app)"
      borderColor="rgba(255, 255, 255, 0.3)"
      borderWidth={2}
      padding="1.5rem"
      notchedCorners={{ topRight: true, bottomLeft: true }}
    >
      <div class="filters-content">
        <!-- Time Window Filter -->
        <div class="filter-section">
          <h3 class="filter-title">Reference Periods</h3>
          <div class="time-window-list">
            {#each timeWindows as window}
              <div class="time-window-item">
                <label class="time-window-label">{window.label}</label>
                <select
                  class="time-window-select"
                  value={window.value}
                  onchange={(e) => updateTimeWindow(window.id, e.currentTarget.value)}
                >
                  {#if window.id === 'current_week'}
                    {#each weekOptions as option}
                      <option value={option}>{option}</option>
                    {/each}
                  {:else if window.id === 'current_month'}
                    {#each monthOptions as option}
                      <option value={option}>{option}</option>
                    {/each}
                  {:else if window.id === 'current_season'}
                    {#each yearOptions as option}
                      <option value={option}>{option}</option>
                    {/each}
                  {/if}
                </select>
              </div>
            {/each}
          </div>
        </div>

        <!-- Club Filter -->
        <div class="filter-section">
          <div class="filter-header">
            <h3 class="filter-title">Reference Opponent Teams</h3>
            <div class="filter-actions">
              <button class="action-btn" onclick={selectAllClubs}>All</button>
              <button class="action-btn" onclick={clearAllClubs}>Clear</button>
            </div>
          </div>

          <div class="clubs-grid">
            {#if availableClubs.length === 0}
              <p class="no-clubs">No teams available</p>
            {:else}
              {#each availableClubs as club}
                <button
                  class="club-chip"
                  class:selected={selectedClubs.includes(club)}
                  onclick={() => toggleClub(club)}
                >
                  {club}
                </button>
              {/each}
            {/if}
          </div>
        </div>
      </div>
    </NotchedBox>
  </div>
{/if}

<style>
  .filters-container {
    width: 100%;
    max-width: 600px;
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .filters-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .filter-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .filter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .filter-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }

  .filter-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.9);
  }

  /* Time Window List */
  .time-window-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .time-window-item {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .time-window-label {
    min-width: 60px;
    font-size: 0.85rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.8);
  }

  .time-window-select {
    flex: 1;
    padding: 0.6rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    transition: all 0.2s ease;
    outline: none;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='white' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
    padding-right: 2.5rem;
  }

  .time-window-select:hover {
    background-color: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .time-window-select:focus {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: white;
  }

  .time-window-select option {
    background: var(--color-bg-app);
    color: white;
    padding: 0.5rem;
  }

  /* Clubs Grid */
  .clubs-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    max-height: 200px;
    overflow-y: auto;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
  }

  .clubs-grid::-webkit-scrollbar {
    width: 6px;
  }

  .clubs-grid::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  .clubs-grid::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  .clubs-grid::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .no-clubs {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.9rem;
    margin: 0;
    text-align: center;
    width: 100%;
  }

  .club-chip {
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .club-chip:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }

  .club-chip.selected {
    background: white;
    color: black;
    border-color: white;
    font-weight: 600;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .filters-container {
      max-width: 100%;
    }

    .time-window-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .time-window-label {
      min-width: auto;
    }

    .time-window-select {
      width: 100%;
    }

    .clubs-grid {
      max-height: 150px;
    }
  }
</style>
