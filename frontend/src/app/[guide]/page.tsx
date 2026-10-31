import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { publicGuides } from "../../lib/public-guides";
import "../landing.css";
import "./guide.css";

export const dynamicParams = false;
export function generateStaticParams() {
  return publicGuides.map(({ slug }) => ({ guide: slug }));
}
async function findGuide(params: Promise<{ guide: string }>) {
  const { guide } = await params;
  const article = publicGuides.find(({ slug }) => slug === guide);
  if (!article) notFound();
  return article;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ guide: string }>;
}): Promise<Metadata> {
  const article = await findGuide(params);
  const url = `https://cipherxcel.dev/${article.slug}/`;
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      title: `${article.title} | AgentBuddy`,
      description: article.description,
      url,
      siteName: "AgentBuddy",
      images: [
        {
          url: "/images/agentbuddy-social.png",
          width: 1200,
          height: 630,
          alt: "AgentBuddy AI productivity workspace",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${article.title} | AgentBuddy`,
      description: article.description,
      images: ["/images/agentbuddy-social.png"],
    },
  };
}
export default async function Guide({
  params,
}: {
  params: Promise<{ guide: string }>;
}) {
  const article = await findGuide(params);
  const url = `https://cipherxcel.dev/${article.slug}/`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: article.title,
        description: article.description,
        isPartOf: { "@id": "https://cipherxcel.dev/#website" },
        author: { "@type": "Person", name: "Priyanshu Raj" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "AgentBuddy",
            item: "https://cipherxcel.dev/",
          },
          { "@type": "ListItem", position: 2, name: article.label, item: url },
        ],
      },
    ],
  };
  return (
    <div className="landing guide-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <a href="#main" className="landing-skip">
        Skip to content
      </a>
      <header className="landing-header">
        <a href="/" className="landing-brand">
          <img src="/icon.svg" width="34" height="34" alt="" />
          AgentBuddy
        </a>
        <a href="/workspace/" className="landing-button landing-button-small">
          Open workspace <ArrowUpRight size={16} />
        </a>
      </header>
      <main id="main">
        <nav className="guide-breadcrumbs" aria-label="Breadcrumb">
          <a href="/">AgentBuddy</a>
          <ChevronRight size={14} />
          <span aria-current="page">{article.label}</span>
        </nav>
        <article>
          <header className="guide-heading">
            <span className="landing-eyebrow">
              {article.label.toUpperCase()}
            </span>
            <h1>{article.heading}</h1>
            <p>{article.intro}</p>
          </header>
          <div className="guide-layout">
            <div className="guide-copy">
              {article.sections.map((section) => (
                <section key={section.heading}>
                  <h2>{section.heading}</h2>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </section>
              ))}
              <aside className="guide-note">
                <strong>Good to know</strong>
                <p>{article.note}</p>
              </aside>
            </div>
            <aside className="guide-start">
              <span className="landing-eyebrow">TRY IT IN YOUR WORKSPACE</span>
              <h2>Getting started</h2>
              <ol>
                {article.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {article.prompts.length > 0 && (
                <>
                  <h3>Try asking Saarthi</h3>
                  {article.prompts.map((prompt) => (
                    <blockquote key={prompt}>{prompt}</blockquote>
                  ))}
                </>
              )}
              <a href="/workspace/" className="landing-button">
                Get started <ArrowUpRight size={16} />
              </a>
            </aside>
          </div>
        </article>
        <section className="guide-related" aria-labelledby="related-heading">
          <h2 id="related-heading">Keep exploring</h2>
          <div>
            {publicGuides
              .filter((item) => item.slug !== article.slug)
              .map((item) => (
                <a key={item.slug} href={`/${item.slug}/`}>
                  <span>{item.label}</span>
                  <strong>{item.title}</strong>
                  <ArrowUpRight size={18} />
                </a>
              ))}
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <a className="landing-brand" href="/">
          AgentBuddy
        </a>
        <span>
          Created by <strong>Priyanshu Raj</strong>
        </span>
        <a href="/#features">
          All features <ArrowUpRight size={14} />
        </a>
      </footer>
    </div>
  );
}
