# GhostX

> A modern, customizable publishing platform built on top of Ghost, designed for creators, communities, memberships, newsletters, and digital content.

[![Based on Ghost](https://img.shields.io/badge/Based%20on-Ghost-15171A?logo=ghost)](https://github.com/TryGhost/Ghost)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active%20Development-orange.svg)](#project-status)

## 📖 About

**GhostX** is a customized and extended version of the open-source [Ghost](https://github.com/TryGhost/Ghost) publishing platform.

The project aims to build a flexible and modern publishing ecosystem while preserving Ghost's powerful publishing capabilities and introducing additional features for creators, communities, publishers, and digital content platforms.

GhostX is currently under active development.

## ✨ Features

* 📝 Powerful content publishing
* 👤 User and member accounts
* 📧 Newsletter support
* 💳 Memberships and subscriptions
* 🔒 Members-only content
* 🎨 Customizable themes and interfaces
* 🔌 API-driven architecture
* 📚 Digital content publishing
* ⚡ High-performance publishing infrastructure
* 🛠️ Extensible architecture
* 🔐 Security-focused development
* 📊 Analytics and content management capabilities

## 🏗️ Technology

GhostX is based on the Ghost codebase and its existing technology stack.

Key technologies include:

* **Node.js**
* **JavaScript / TypeScript**
* **React**
* **Ember.js**
* **Express**
* **MySQL**
* **Redis**
* **pnpm**
* **Nx**

> GhostX follows the upstream Ghost development workflow and currently uses **pnpm** as its package manager.

## 📂 Project Structure

```text
GhostX/
├── apps/                 # Application packages
├── configs/              # Shared configuration
├── docker/               # Docker configuration
├── docs/                 # Documentation
├── e2e/                  # End-to-end tests
├── ghost/
│   └── core/             # Ghost Core
├── koenig/               # Editor-related packages
├── packages/             # Shared packages and libraries
├── scripts/              # Development and build scripts
├── .github/              # GitHub workflows and configuration
├── package.json          # Root package configuration
├── pnpm-workspace.yaml   # pnpm workspace configuration
└── README.md             # Project documentation
```

> The project structure may change as GhostX evolves.

## 🚀 Getting Started

### Prerequisites

Before developing GhostX, make sure you have the required tools installed:

* [Node.js](https://nodejs.org/)
* [pnpm](https://pnpm.io/)
* Git
* MySQL
* Redis
* Docker *(optional)*

### Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/GhostX.git
cd GhostX
```

### Initialize pnpm

For a fresh checkout:

```bash
pnpm setup
```

Restart your terminal if required so that pnpm becomes available.

### Install Dependencies

```bash
pnpm install
```

### Start Development

Use the development commands defined by the current GhostX codebase:

```bash
pnpm dev
```

For the complete development workflow, consult the project's development documentation.

## ⚙️ Environment Configuration

GhostX may require environment variables for local development and production.

If the repository provides an environment template, copy it before starting development:

```bash
cp .env.example .env
```

Configure the required values in `.env`.

### 🔐 Important

**Never commit secrets to GitHub.**

Do not commit:

* API keys
* Database passwords
* Authentication secrets
* Private tokens
* Cloud credentials
* Encryption keys
* Production environment variables

Make sure sensitive files are included in `.gitignore`.

## 🧪 Testing

Run the project's standard validation checks with:

```bash
pnpm check
```

Additional tests may be available for individual applications and packages.

For example:

```bash
pnpm test
```

Refer to the relevant package documentation before running specialized tests.

## 🐳 Docker

Docker can be used for local development and infrastructure services.

Start the development environment with the appropriate Compose configuration:

```bash
docker compose up
```

For production deployment, use the project's production documentation and configuration rather than the development Compose setup.

## 🗺️ Roadmap

GhostX is evolving continuously.

### Planned Features

* [ ] Modernized user experience
* [ ] Enhanced creator profiles
* [ ] Community functionality
* [ ] Advanced content discovery
* [ ] Improved analytics
* [ ] Additional membership tools
* [ ] Digital content marketplace
* [ ] Creator monetization features
* [ ] Enhanced administration tools
* [ ] Performance improvements
* [ ] Security hardening
* [ ] Mobile-focused improvements
* [ ] Developer APIs and integrations
* [ ] Additional customization options

## 🔐 Security

Security is a core priority of GhostX.

If you discover a security vulnerability, **do not publicly disclose it through GitHub Issues**.

Please report security issues privately through the appropriate security reporting process.

See [SECURITY.md](SECURITY.md) for additional information.

## 🤝 Contributing

Contributions are welcome.

### 1. Fork GhostX

Create your own fork of the GhostX repository.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/GhostX.git
cd GhostX
```

### 3. Create a Branch

```bash
git checkout -b feature/my-feature
```

### 4. Make Your Changes

Implement your changes while following the project's coding and contribution guidelines.

### 5. Validate Your Changes

```bash
pnpm check
```

Run any additional tests required for the area you modified.

### 6. Commit Your Changes

```bash
git add .
git commit -m "feat: add my feature"
```

### 7. Push Your Branch

```bash
git push origin feature/my-feature
```

### 8. Open a Pull Request

Open a Pull Request on GitHub and explain:

* What you changed
* Why you changed it
* How you tested it
* Any relevant screenshots or documentation

## 📜 License

GhostX is derived from the open-source [Ghost](https://github.com/TryGhost/Ghost) project.

The upstream Ghost project is released under the **MIT License**. Ghost and the Ghost logo are trademarks of the Ghost Foundation.

GhostX must retain and comply with the applicable licenses, copyright notices, and trademark requirements of the upstream project and its dependencies.

See [LICENSE](LICENSE) for the applicable license information.

## 🙏 Acknowledgements

GhostX is built upon the work of the Ghost Foundation and the Ghost open-source community.

Special thanks to the developers and contributors behind:

* [Ghost](https://github.com/TryGhost/Ghost)
* Node.js
* React
* Ember.js
* Express
* MySQL
* Redis
* Nx
* pnpm

## 📌 Project Status

**🚧 Active Development**

GhostX is currently being customized and developed.

Features, APIs, architecture, and project structure may change as development progresses.

This project should be considered experimental until a stable release is announced.

## 🌐 Links

* **GhostX:** `https://github.com/YOUR_USERNAME/GhostX`
* **Original Ghost Repository:** `https://github.com/TryGhost/Ghost`
* **Ghost Website:** `https://ghost.org`
* **Ghost Documentation:** `https://ghost.org/docs/`

---

⭐ **If you find GhostX useful, consider starring the repository and contributing to the project.**

**Built with ❤️ by the GhostX community.**
