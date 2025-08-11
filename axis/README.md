# OBINexus Axis Architecture

## Repository Structure

```
axis/
├── index.html              # Main entry point
├── docs/                   # Documentation
│   ├── creative-portfolio.pdf
│   ├── creative-project-master.pdf
│   └── telemetry-architecture.pdf
├── diagrams/              # PlantUML diagrams
│   ├── division-hierarchy.puml
│   ├── handwritten-model.puml
│   ├── shrinking-stack.puml
│   ├── transcribed-model.puml
│   └── ux-flow-stack.puml
├── manifestos/            # OBINexus manifestos
│   ├── design-tech-manifesto-v2.pdf
│   └── manifesto-v2.md
├── scripts/               # Core JavaScript modules
│   ├── axis-access-control.js
│   ├── axis-router.js
│   ├── ConstituionalContract.js
│   ├── economicbreath.js
│   ├── EconomicEntity.js
│   └── hybrid_optimzor.js
└── assets/               # Images and media
    └── handwritten-sketch-20250811.jpg
```

## Core Architecture

The OBINexus Axis system implements a three-dimensional gating strategy:

- **X-Axis**: Workflow (todo → doing → done)
- **Y-Axis**: Validation (open → validate → close)
- **Z-Axis**: Deployment (stage → deploy → monitor)

## Quick Start

```bash
# Clone the repository
git clone --recurse-submodules https://github.com/obinexus/axis.git

# Navigate to the project
cd axis

# Open in browser
open index.html
```

## Documentation

- [Design & Technology Manifesto](manifestos/design-tech-manifesto-v2.pdf)
- [Creative Portfolio](docs/creative-portfolio.pdf)
- [Telemetry Architecture](docs/telemetry-architecture.pdf)

## License

© 2025 OBINexus Foundation | Built with ❤️ during civil collapse
