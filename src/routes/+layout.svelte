<script lang="ts">
  import '../app.css';
  import { onNavigate } from '$app/navigation';

  // Active les View Transitions pour les animations entre pages
  onNavigate((navigation) => {
    if (!document.startViewTransition) return;

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>

<slot />
