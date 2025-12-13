<script lang="ts">
  type Props = {
    weight: number; // 0-1
    onWeightChange: (newWeight: number) => void;
  };

  let { weight, onWeightChange }: Props = $props();

  let percentage = $derived(Math.round(weight * 100));
  let isDragging = $state(false);
  let trackElement: HTMLDivElement | undefined = $state();

  function handleChange(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    onWeightChange(parseFloat(target.value) / 100);
  }

  function handleTrackClick(e: MouseEvent) {
    if (!trackElement) return;

    const rect = trackElement.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newPercentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));

    onWeightChange(newPercentage / 100);
  }

  function handleTrackMouseDown(e: MouseEvent) {
    isDragging = true;
    handleTrackClick(e);

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !trackElement) return;
      handleTrackClick(e);
    };

    const handleMouseUp = () => {
      isDragging = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }
</script>

<div class="weight-slider-compact">
  <div class="percentage-label">{percentage}%</div>
  <div
    class="slider-container"
    bind:this={trackElement}
    onmousedown={handleTrackMouseDown}
    role="slider"
    tabindex="0"
    aria-valuenow={percentage}
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div class="slider-track">
      <div class="slider-fill" style:width="{percentage}%"></div>
    </div>
  </div>
</div>

<style>
  .weight-slider-compact {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.25rem;
    padding: 0.25rem 0;
  }

  .percentage-label {
    font-size: 0.75rem;
    font-weight: bold;
    color: white;
    min-width: 35px;
    text-align: left;
  }

  .slider-container {
    position: relative;
    flex: 1;
    height: 20px;
    min-width: 80px;
    cursor: pointer;
  }

  .slider-track {
    position: absolute;
    width: 100%;
    height: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
  }

  .slider-fill {
    position: absolute;
    left: 0;
    height: 100%;
    background: linear-gradient(to right, #00cc50, #00ff64);
    transition: width 0.05s ease;
    border-radius: 4px;
    pointer-events: none;
  }
</style>
