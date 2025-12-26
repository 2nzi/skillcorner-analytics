<script lang="ts">
  import TeamPerformanceScatter from '$lib/components/features/team-analysis/TeamPerformanceScatter.svelte';
</script>

<div class="team-analysis-page">
  <TeamPerformanceScatter width={900} height={600} />
</div>

<style>
  .team-analysis-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    width: 100%;
  }
</style>
