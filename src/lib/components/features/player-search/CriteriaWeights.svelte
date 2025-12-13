<script lang="ts">
  type Props = {
    criteria: { id: string; name: string }[];
    weights?: Record<string, number>; // Poids de chaque critère (0-1)
    onWeightsChange?: (weights: Record<string, number>) => void;
  };

  let { criteria, weights = {}, onWeightsChange }: Props = $props();

  // Initialiser les poids de manière équitable si non fournis
  let criteriaWeights = $state<Record<string, number>>({});

  $effect(() => {
    if (criteria.length > 0 && Object.keys(criteriaWeights).length === 0) {
      const equalWeight = 1 / criteria.length;
      const initialWeights: Record<string, number> = {};
      criteria.forEach(c => {
        initialWeights[c.id] = weights[c.id] ?? equalWeight;
      });
      criteriaWeights = initialWeights;
    }
  });

  // Slider en cours d'ajustement
  let isDragging = $state<string | null>(null);

  function handleWeightChange(criterionId: string, newPercentage: number) {
    const newWeight = newPercentage / 100;
    const oldWeight = criteriaWeights[criterionId] || 0;
    const delta = newWeight - oldWeight;

    // Calculer le poids total des autres critères
    const otherCriteria = criteria.filter(c => c.id !== criterionId);
    const otherTotalWeight = otherCriteria.reduce((sum, c) => sum + (criteriaWeights[c.id] || 0), 0);

    // Créer les nouveaux poids
    const newWeights: Record<string, number> = { ...criteriaWeights };
    newWeights[criterionId] = newWeight;

    // Redistribuer la différence proportionnellement sur les autres critères
    if (otherTotalWeight > 0 && otherCriteria.length > 0) {
      otherCriteria.forEach(c => {
        const proportion = (criteriaWeights[c.id] || 0) / otherTotalWeight;
        const adjustment = delta * proportion;
        newWeights[c.id] = Math.max(0, Math.min(1, (criteriaWeights[c.id] || 0) - adjustment));
      });
    } else if (otherCriteria.length > 0) {
      // Si tous les autres sont à 0, redistribuer équitablement
      const remainingWeight = Math.max(0, 1 - newWeight);
      const equalShare = remainingWeight / otherCriteria.length;
      otherCriteria.forEach(c => {
        newWeights[c.id] = equalShare;
      });
    }

    // Normaliser pour garantir que la somme = 1
    const total = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
    if (total > 0) {
      Object.keys(newWeights).forEach(key => {
        newWeights[key] = newWeights[key] / total;
      });
    }

    criteriaWeights = newWeights;
    onWeightsChange?.(newWeights);
  }

  function startDrag(criterionId: string) {
    isDragging = criterionId;
  }

  function stopDrag() {
    isDragging = null;
  }
</script>

<svelte:window onmouseup={stopDrag} />

<div class="criteria-weights">
  <div class="weights-container">
    {#each criteria as criterion}
      {@const weight = criteriaWeights[criterion.id] || 0}
      {@const percentage = Math.round(weight * 100)}
      <div class="weight-item">
        <div class="criterion-label">{criterion.name}</div>
        <div class="slider-wrapper">
          <div class="percentage">{percentage}%</div>
          <div class="slider-container">
            <div class="slider-track">
              <div
                class="slider-fill"
                style:width="{percentage}%"
              ></div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={percentage}
              class="slider"
              class:dragging={isDragging === criterion.id}
              oninput={(e) => handleWeightChange(criterion.id, parseFloat(e.currentTarget.value))}
              onmousedown={() => startDrag(criterion.id)}
            />
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .criteria-weights {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    gap: 1rem;
  }

  .weights-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .weight-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .criterion-label {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
  }

  .slider-wrapper {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .percentage {
    font-size: 1rem;
    font-weight: bold;
    color: white;
    min-width: 50px;
    text-align: left;
  }

  .slider-container {
    position: relative;
    flex: 1;
    height: 30px;
  }

  .slider-track {
    position: absolute;
    width: 100%;
    height: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    overflow: hidden;
  }

  .slider-fill {
    position: absolute;
    left: 0;
    height: 100%;
    background: linear-gradient(to right, #00cc50, #00ff64);
    transition: width 0.1s ease;
    border-radius: 6px;
  }

  .slider {
    position: absolute;
    width: 100%;
    height: 30px;
    top: 0;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
    z-index: 1;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    border: 2px solid #00ff64;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
  }

  .slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    border: 2px solid #00ff64;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
  }

  .slider:hover::-webkit-slider-thumb,
  .slider.dragging::-webkit-slider-thumb {
    transform: scale(1.2);
    box-shadow: 0 3px 6px rgba(0, 255, 100, 0.4);
  }

  .slider:hover::-moz-range-thumb,
  .slider.dragging::-moz-range-thumb {
    transform: scale(1.2);
    box-shadow: 0 3px 6px rgba(0, 255, 100, 0.4);
  }
</style>
