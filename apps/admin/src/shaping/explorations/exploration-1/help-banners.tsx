import BannerGraphic from './assets/dashboard-graphics.png';
import React from 'react';
import { Button } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Exploration 1's help links at the bottom of Overview: the content
// distribution article as a full-width banner (after the Vision prototype's
// AnalyticsBanner, in Shade's yellow 200, with its letterform graphic, copied
// from the Vision), then the analytics help doc as a plain text link under
// it. Both open in a new tab, as today's HelpCards do.
//
// Next to explore: the article with an editorial feel rather than a banner's.

const HelpBanners: React.FC = () => (
  <div className="flex flex-col items-start gap-4">
    <a
      className="group/banner relative flex min-h-[180px] w-full items-center overflow-hidden rounded-[2px] bg-yellow-200"
      href="https://ghost.org/resources/content-distribution/"
      rel="noreferrer"
      target="_blank"
    >
      {/* The text keeps the Vision's measure; the graphic fills the right */}
      <div className="relative z-10 flex max-w-[min(520px,60%)] flex-col gap-3 p-8">
        <h3 className="text-2xl leading-tight font-medium tracking-[-0.02em] text-foreground">
          Get your content seen online
        </h3>
        <p className="text-md leading-snug text-foreground">
          Creating content is only one-half of the creator puzzle. Distribution is the other half.
          The more you internalize this idea, the better results you’ll see from your work.
        </p>
        <div className="mt-3">
          {/* Presentational: the whole banner is the link */}
          <Button asChild>
            <span>Read article</span>
          </Button>
        </div>
      </div>
      <img
        alt=""
        aria-hidden="true"
        className="absolute top-0 right-0 h-full max-w-[40%] rounded-none! object-cover object-left"
        src={BannerGraphic}
      />
    </a>

    {/* The help doc: a plain text link, like the latest post's "View
        analytics" */}
    <a
      className="flex items-center gap-1.5 text-md text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-4 [&_svg]:stroke-[1.5px]"
      href="https://ghost.org/help/native-analytics"
      rel="noreferrer"
      target="_blank"
    >
      About analytics in Ghost
      <LucideIcon.ArrowRight />
    </a>
  </div>
);

export default HelpBanners;
