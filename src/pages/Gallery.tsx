import type { ReactNode } from 'react'
import {
  Breadcrumb,
  MinimisedFloatingMenu,
  Pill,
  Row,
  DeviceSize,
  TopPills,
} from '../components'
import { TopNav, BreadcrumbsTab, StatsBar, MasterImage, RightNav, Sidebar } from '../molecules'
import { InfiniteCanvas, CanvasSection } from '../canvas'
import { SEED_PROJECTS } from '../data/seed/noonAtlasSeed'

function Section({ title, node, children }: { title: string; node: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <h2 className="pixel" style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
          {title}
        </h2>
        <span className="pixel" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          {node}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 20,
          padding: 24,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {children}
      </div>
    </section>
  )
}

export default function Gallery() {
  return (
    <InfiniteCanvas>
      {/* The component gallery is the first section mounted onto the atlas. */}
      <CanvasSection x={0} y={0} width={980}>
        <main style={{ padding: '48px 40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h1 className="pixel" style={{ margin: 0, fontSize: 22, color: '#FFFFFF' }}>
            noon Atlas — Components
          </h1>
          <p className="pixel" style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            Built 1:1 from Figma · Geist Pixel
          </p>
        </header>

        <Section title="Breadcrumbs" node="14:9297">
          <Breadcrumb label="Categories" state="past" />
          <Breadcrumb label="Premium TVs" state="current" />
        </Section>

        <Section title="Pills" node="25:22917">
          <Pill label="Map" selected />
          <Pill label="Screens" />
        </Section>

        <Section title="Top Pills" node="14:9105">
          <TopPills label="Screens" count={48} />
        </Section>

        <Section title="Row" node="8:8370">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Row label="Monetisation_per_day" value="380.000" />
          </div>
        </Section>

        <Section title="Device Size" node="25:25261">
          <DeviceSize device="iphone 13 Pro" dimensions="375 x 812" />
        </Section>

        <Section title="Minimised Floating Menu" node="14:9220">
          <MinimisedFloatingMenu label="noon Homepage" />
        </Section>
          </div>
        </main>
      </CanvasSection>

      {/* Molecules — composed from the atoms above. */}
      <CanvasSection x={1060} y={0} width={900}>
        <main style={{ padding: '48px 40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h1 className="pixel" style={{ margin: 0, fontSize: 22, color: '#FFFFFF' }}>
                noon Atlas — Molecules
              </h1>
              <p className="pixel" style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                Composed from the atoms · Geist Pixel
              </p>
            </header>

            <Section title="Top Nav" node="27:30665">
              <TopNav variant="left" />
              <TopNav variant="right" />
            </Section>

            <Section title="Breadcrumbs Tab" node="35:46574">
              <BreadcrumbsTab />
            </Section>

            <Section title="Stat's bar" node="25:22918">
              <StatsBar />
            </Section>

            <Section title="Master Image" node="25:27389">
              <MasterImage />
            </Section>

            <Section title="Right Nav" node="27:32356">
              <RightNav />
            </Section>
          </div>
        </main>
      </CanvasSection>

      {/* Sidebar — 3 variants of the component. */}
      <CanvasSection x={2020} y={0} width={1180}>
        <main style={{ padding: '48px 40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h1 className="pixel" style={{ margin: 0, fontSize: 22, color: '#FFFFFF' }}>
                noon Atlas — Sidebar
              </h1>
              <p className="pixel" style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                3 states · Geist Pixel · node 41:54662
              </p>
            </header>

            {/* These were once a `variant` prop with a hardcoded highlight. They're
                real states now — selection derives from which project is open. */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span className="pixel" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  Default
                </span>
                <Sidebar projects={SEED_PROJECTS} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span className="pixel" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  Selected
                </span>
                <Sidebar projects={SEED_PROJECTS} activeProjectId="image-first-navigation" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span className="pixel" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  Pod
                </span>
                <Sidebar projects={SEED_PROJECTS} activeProjectId="storefront" />
              </div>
            </div>
          </div>
        </main>
      </CanvasSection>
    </InfiniteCanvas>
  )
}
