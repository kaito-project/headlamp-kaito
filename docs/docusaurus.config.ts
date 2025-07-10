import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
// This runs in Node.js

const config: Config = {
  title: 'Headlamp Kaito Plugin',
  tagline: 'Kubernetes AI Toolchain Operator Plugin for Headlamp',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://kaito-project.github.io/',

  baseUrl: '/headlamp-kaito/',

  organizationName: 'kaito-project',
  projectName: 'headlamp-kaito',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/kaito-project/headlamp-kaito/edit/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      },
    ],
  ],

  themeConfig: {
    image: 'img/kaito-logo.png',
    navbar: {
      title: 'Headlamp Kaito',
      logo: {
        alt: 'Kaito Logo',
        src: 'img/kaito-logo.png',
      },
      items: [
        {
          href: 'https://github.com/kaito-project/headlamp-kaito',
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub repository',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/',
            },
            {
              label: 'Installation',
              to: '/getting-started/installation',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/kaito-project/headlamp-kaito',
            },
            {
              label: 'Slack',
              href: 'https://join.slack.com/t/kaito-z6a6575/shared_invite/zt-37gh89vw7-odHfqmPRc5oRnDG99SBJNA',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Kaito Project, Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'yaml', 'go'],
    },
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    announcementBar: {
      id: 'announcementBar-1',
      content: `⭐️ If you like Kaito, please give it a star on <a target="_blank" rel="noopener noreferrer" href="https://github.com/kaito-project/headlamp-kaito">GitHub</a>!`,
    },
  },
};
export default config;
