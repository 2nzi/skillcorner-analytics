<script lang="ts">
  import { page } from '$app/stores';
  import { derived } from 'svelte/store';

  // Navigation principale : Collective vs Individual
  const mainNavItems = [
    {
      id: 'collective',
      label: 'Collective',
      transitionName: 'nav-collective'
    },
    {
      id: 'individual',
      label: 'Individual',
      transitionName: 'nav-individual'
    }
  ];

  // Sous-pages pour chaque groupe
  const subPages = {
    collective: [
      { href: '/match-analysis', label: 'Match Analysis' },
      { href: '/team-analysis', label: 'Team Analysis' }
    ],
    individual: [
      { href: '/player-search', label: 'Scouting' },
      { href: '/player-analysis', label: 'Player Analysis' }
    ]
  };

  // Détecter le groupe actif en fonction de l'URL
  const activeGroup = derived(page, ($page) => {
    const path = $page.url.pathname;
    if (path.includes('match-analysis') || path.includes('team-analysis')) {
      return 'collective';
    }
    return 'individual';
  });
</script>

<div class="app-layout">
  <!-- Barre latérale verticale pour les sous-pages - divisée en 2 -->
  <aside class="sidebar">
    {#each subPages[$activeGroup] as subPage}
      <a
        href={subPage.href}
        class="sidebar-section"
        class:active={$page.url.pathname === subPage.href}
      >
        <span class="sidebar-text">{subPage.label}</span>
      </a>
    {/each}
  </aside>

  <!-- Container pour navbar et contenu principal -->
  <div class="main-area">
    <!-- Navbar principale : Collective vs Individual -->
    <nav class="main-navbar">
      <div class="nav-tabs">
        {#each mainNavItems as item}
          <a
            href={subPages[item.id][0].href}
            class="nav-tab"
            class:active={$activeGroup === item.id}
            style="view-transition-name: {item.transitionName};"
          >
            <span class="tab-label">{item.label}</span>
          </a>
        {/each}
      </div>
    </nav>

    <!-- Contenu principal -->
    <main class="main-content">
      <slot />
    </main>
  </div>
</div>

<style>
  .app-layout {
    width: 100%;
    height: 100vh;
    background: var(--color-bg-home);
    display: flex;
    overflow: hidden; /* Prevent any scrolling on the layout itself */
  }

  .main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0; /* Allow flex item to shrink below content size */
    overflow: hidden; /* Contain scroll to main-content only */
  }

  /* ===== NAVBAR PRINCIPALE (TABS) ===== */
  .main-navbar {
    background: var(--color-bg-app);
    z-index: 1000;
    flex-shrink: 0; /* Prevent navbar from shrinking */
    display: flex;
    justify-content: center;
    align-items: center;
    padding-top: 2rem;
    padding-bottom: 1rem;
    animation: slideDown 0.5s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .nav-tabs {
    display: flex;
    gap: 1.5rem;
    align-items: center;
    justify-content: center;
  }

  /* ===== TABS (avec coins coupés) ===== */
  .nav-tab {
    --notch: 10px;

    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem 3rem;
    text-decoration: none;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 500;
    font-size: 0.9rem;
    transition: all 0.1s ease;
    white-space: nowrap;
    background: rgba(255, 255, 255, 0.1);

    /* Coins coupés : bas gauche et haut droit */
    clip-path: polygon(
      0 0,
      calc(100% - var(--notch)) 0,
      100% var(--notch),
      100% 100%,
      var(--notch) 100%,
      0 calc(100% - var(--notch))
    );
  }

  .nav-tab:hover {
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.15);
  }

  .nav-tab.active {
    color: #000;
    background: #fff;
    font-weight: 600;
  }

  .nav-tab.active:hover {
    background: #fff;
  }

  .tab-label {
    font-size: 0.9rem;
  }

  /* ===== SIDEBAR VERTICALE ===== */
  .sidebar {
    width: 60px;
    flex-shrink: 0;
    background: transparent;
    display: flex;
    flex-direction: column;
    overflow: visible;
    gap: 0.5rem !important;
    padding: 0.5rem !important;
  }

  .sidebar-section {
    --notch: 10px;

    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    color: rgba(255, 255, 255, 0.6);
    transition: all 0.2s ease;
    position: relative;
    background: var(--color-bg-app);

    /* Coins coupés : haut gauche et bas droit */
    clip-path: polygon(
      var(--notch) 0,
      100% 0,
      100% calc(100% - var(--notch)),
      calc(100% - var(--notch)) 100%,
      0 100%,
      0 var(--notch)
    );
  }

  .sidebar-text {
    transform: rotate(-90deg);
    white-space: nowrap;
    font-size: 0.9rem;
    font-weight: 500;
    letter-spacing: 0.05em;
  }

  .sidebar-section:hover {
    background: color-mix(in srgb, var(--color-bg-app) 80%, transparent);
    color: rgba(255, 255, 255, 0.9);
  }

  .sidebar-section.active {
    background: #fff;
    color: #000;
  }

  .sidebar-section.active .sidebar-text {
    font-weight: 600;
  }

  /* ===== MAIN CONTENT ===== */
  .main-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: auto;
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 768px) {
    .sidebar {
      width: 60px;
    }

    .sidebar-text {
      font-size: 0.75rem;
    }

    .main-navbar {
      padding-top: 1.5rem;
    }

    .nav-tabs {
      gap: 1rem;
    }

    .nav-tab {
      padding: 0.5rem 2rem;
      font-size: 0.85rem;
    }
  }

  @media (max-width: 480px) {
    .sidebar {
      width: 50px;
    }

    .sidebar-text {
      font-size: 0.7rem;
    }

    .nav-tab {
      padding: 0.4rem 1.5rem;
      font-size: 0.8rem;
    }
  }
</style>
