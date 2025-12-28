<div align="center">

<a href="https://skillcorner.com/fr/sports/football" target="_blank">
  <img src="https://avatars.githubusercontent.com/u/72439998?s=280&v=4" alt="SkillCorner Logo" width="150" style="margin: 0 20px"/>
</a>

<a href="https://pysport.org/" target="_blank">
  <img src="https://pysport.org/static/media/logo.d7231fdc56aed9fb78a21a9bef3bcbb1.svg" alt="PySport Logo" width="150" style="margin: 0 20px"/>
</a>

</div>

---

# SkillCorner Analytics Platform

An interactive web-based football analytics platform for comprehensive match and team performance analysis using SkillCorner tracking and event data.

---

## Abstract

### Introduction

This submission presents an **interactive web-based analytics platform** built with SvelteKit and TypeScript, transforming SkillCorner tracking and event data from the [SkillCorner Open Data Repository](https://github.com/SkillCorner/opendata) into actionable insights through intuitive, synchronized visualizations.

### Use Cases

**Team Analysis**: Interactive scatter plots for comparative team performance across matches. Dynamic metric selection on both axes with color-coded team identification and match filtering reveals performance.

**Match Analysis**: Frame-by-frame match replay with synchronized components: football field with player/ball tracking, phase-of-play detection showing ball movement ranges and pass networks, chronological events list with automatic scrolling, and cumulative performance charts (xThreat, player-targeted xThreat, xPass completion). Interactive timeline navigation with adjustable playback speed.

**Player Analysis**: Individual event tracking with detailed metrics including possession time, force backward actions, affected line breaks, and regain statistics.

**Scouting**: Cross-match performance aggregation enabling player comparison and recruitment insights through objective, quantifiable metrics.

### Potential Audience

- **Performance Analysts**: Post-match tactical analysis and opponent scouting
- **Coaching Staff**: Training session planning and in-game strategy development
- **Recruitment Teams**: Objective player evaluation across competitions
- **Football Enthusiasts**: Educational tool for understanding modern analytics

---

## Run Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The application will be available at `http://localhost:5173`

---

## Video URL

[Screen Recording - Coming Soon]

---

## URL to Web App / Website

Here the [Skillcorner-PySport Web Application](https://skillcorner-analytics-production.up.railway.app/)

---

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   └── features/
│   │       ├── match-analysis/      # Match replay components
│   │       ├── team-analysis/       # Team comparison visualizations
│   │       └── player-analysis/     # Individual player metrics
│   ├── utils/
│   │   ├── match-analysis/          # Phase detection, coordinate transforms
│   │   ├── dataFilters.ts           # Data processing utilities
│   │   └── coordinateTransform.ts   # Spatial data transformations
│   └── types/                       # TypeScript type definitions
├── routes/
│   └── (app)/
│       ├── match-analysis/          # Match analysis page
│       ├── team-analysis/           # Team comparison page
│       └── player-analysis/         # Player metrics page
└── data/                            # SkillCorner dataset (from GitHub repo)
```

---

## ✨ Key Features

### Match Analysis
- Real-time tracking visualization with player positions and ball movement
- Phase-of-play detection with automatic range calculation
- Pass network visualization with coordinate transformation
- Cumulative performance metrics (xThreat, player-targeted xThreat, xPass completion)
- Interactive timeline with playback controls and speed adjustment
- Event-driven navigation with automatic field synchronization

### Team Analysis
- Dynamic scatter plot visualizations
- Multi-metric comparison (goals, assists, distance, passes)
- Color-coded team identification
- Match-by-match filtering
- Performance trend analysis

### Player Analysis
- Individual event tracking and metrics
- Possession analysis with detailed breakdowns
- Tactical contribution metrics (force backward, line breaks, regains)
- Visual event timeline with field overlay

---

## 📝 Development Notes

### Project Context

This project was developed as part of the SkillCorner X PySport Analytics Cup (Analyst Track). The platform demonstrates how rich spatiotemporal football data can be transformed into accessible, interactive visualizations for tactical analysis.

### Technical Challenges

During development, hardware failure resulted in partial code loss despite version control. Some components and code cleanup work had to be rebuilt from earlier commits, which may result in inconsistent code quality across different modules.

### Current Limitations

- **Code Quality**: Some sections require refactoring and better documentation
- **Performance**: Large datasets may cause slowdowns in certain visualizations
- **Error Handling**: Not all edge cases are comprehensively handled
- **Testing**: Limited automated test coverage

### Development Process

As a Data Engineering student learning web development and football analytics, this project represents significant learning across multiple domains. All design choices, feature specifications, and data analysis approaches were directed by the developer.

### Future Improvements

- Code refactoring and cleanup
- Comprehensive documentation
- Performance optimizations for large datasets
- Additional metric visualizations
- Enhanced error handling and validation
- Unit and integration testing
- Mobile-responsive design

---

## 📚 Data Attribution

All tracking and event data used in this project comes from the [SkillCorner Open Data Repository](https://github.com/SkillCorner/opendata). The data has been included in this repository for submission purposes as per Analytics Cup requirements.

---

## License

This project was created for the SkillCorner X PySport Analytics Cup. Please refer to the competition rules for usage guidelines.

---

## Acknowledgments

- **SkillCorner** for providing high-quality tracking and event data
- **PySport** for organizing the Analytics Cup
- **Claude AI (Anthropic)** for development assistance, architectural guidance, and debugging support
- The football analytics community for inspiration and methodological frameworks
