import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { StructuredData } from "@/components/StructuredData";
import { siteConfig } from "@/lib/site";

const summaryPoints = [
  "AI engineer with 6 years of experience designing and deploying scalable machine learning and MLOps pipelines.",
  "Skilled in Python, AWS SageMaker, Databricks, Spark, and PyTorch for building and operationalizing models.",
  "Built low-latency inference services and led cross-functional teams to deliver end-to-end AI solutions."
];

const resumeTranscript = `DEVIN OTTO

Los Angeles, CA | 310 971 1108 | devin@devcandoit.com | linkedin.com/in/devinjotto

Professional Summary
AI engineer with 6 years of experience designing and deploying scalable machine learning and MLOps pipelines. Skilled in Python, AWS SageMaker, Databricks, Spark, and PyTorch for building and operationalizing models including fine-tuned GPT-4. Built low-latency inference services and led cross-functional teams to deliver end-to-end AI solutions.

Skills
Languages: Python, TypeScript, JavaScript, SQL
Frameworks: Flask, FastAPI, React, Node.js
Machine Learning: PyTorch, XGBoost, Random Forest, PEFT tuning, embeddings, feature engineering, Conversational AI, Deep Learning, Reinforcement Learning
Data and MLOps: Databricks, Spark, ML pipelines, automation, model training and deployment
Cloud and DevOps: AWS SageMaker, EC2, S3, Neptune, GCP, Docker, CI/CD, Azure Cloud, Git
Other: API design, systems design, workflow automation, CA Real Estate Salesperson License, JIRA

Experience
Allogene Therapeutics Aug 2023 - May 2025
Scientist South San Francisco, CA
Designed internal MLOps pipelines on Azure Cloud for classification, regression, and clustering
Trained models using PyTorch, Random Forest, and XGBoost, applying deep learning techniques to improve accuracy
Built automated pipelines using AWS, Databricks, Pandas, and Spark with version control in Git
Tuned a GPT-4 conversational AI model using PEFT
Led Process Development efforts on the Datalake Engineering Team
Executed DOE programs to generate standardized datasets

Allogene Therapeutics Feb 2021 - Aug 2023
Senior Associate Scientist South San Francisco, CA
Led Benchling implementation and automation roadmap
Built ML prototypes using reinforcement learning for early predictive systems
Served as SME for automated processing systems
Upgraded pipelines and data flows across three sites
Built internal dashboards and analytics tools

Bristol Myers Squibb Sep 2019 - Jan 2021
Manufacturing Associate II Seattle, WA
Improved operational workflows for commercial CAR T manufacturing
SME for Xuri Wave bioreactor and SOP optimization
Built scheduling systems for cross shift operations
Wrote validation and process transfer documentation

Kite Pharma Feb 2018 - Sep 2019
Cell Therapy Specialist El Segundo, CA
Led deviation reduction and data centralization projects
Redesigned batch record flows to support digital transition
Built cloud automation tools using Power Automate and integrated workflows tracked via JIRA

Education
University of California, Davis
Bachelor of Arts, Plant Molecular Biology

Jan 2012 - Jan 2016`;

const skills = [
  {
    title: "Languages",
    body: "Python, TypeScript, JavaScript, SQL"
  },
  {
    title: "Frameworks",
    body: "Flask, FastAPI, React, Node.js"
  },
  {
    title: "Machine Learning",
    body: "PyTorch, XGBoost, Random Forest, PEFT tuning, embeddings, feature engineering, conversational AI, deep learning, reinforcement learning"
  },
  {
    title: "Data and MLOps",
    body: "Databricks, Spark, ML pipelines, automation, model training, deployment"
  },
  {
    title: "Cloud and DevOps",
    body: "AWS SageMaker, EC2, S3, Neptune, GCP, Docker, CI/CD, Azure Cloud, Git"
  },
  {
    title: "Other",
    body: "API design, systems design, workflow automation, CA Real Estate Salesperson License, JIRA"
  }
];

const experience = [
  {
    company: "Allogene Therapeutics",
    role: "Scientist",
    dates: "Aug 2023 - May 2025",
    location: "South San Francisco, CA",
    bullets: [
      "Designed internal MLOps pipelines on Azure Cloud for classification, regression, and clustering.",
      "Trained models using PyTorch, Random Forest, and XGBoost, applying deep learning techniques to improve accuracy.",
      "Built automated pipelines using AWS, Databricks, Pandas, and Spark with version control in Git.",
      "Tuned a GPT-4 conversational AI model using PEFT.",
      "Led process development efforts on the Datalake Engineering Team.",
      "Executed DOE programs to generate standardized datasets."
    ]
  },
  {
    company: "Allogene Therapeutics",
    role: "Senior Associate Scientist",
    dates: "Feb 2021 - Aug 2023",
    location: "South San Francisco, CA",
    bullets: [
      "Led Benchling implementation and automation roadmap.",
      "Built ML prototypes using reinforcement learning for early predictive systems.",
      "Served as SME for automated processing systems.",
      "Upgraded pipelines and data flows across three sites.",
      "Built internal dashboards and analytics tools."
    ]
  },
  {
    company: "Bristol Myers Squibb",
    role: "Manufacturing Associate II",
    dates: "Sep 2019 - Jan 2021",
    location: "Seattle, WA",
    bullets: [
      "Improved operational workflows for commercial CAR T manufacturing.",
      "SME for Xuri Wave bioreactor and SOP optimization.",
      "Built scheduling systems for cross-shift operations.",
      "Wrote validation and process transfer documentation."
    ]
  },
  {
    company: "Kite Pharma",
    role: "Cell Therapy Specialist",
    dates: "Feb 2018 - Sep 2019",
    location: "El Segundo, CA",
    bullets: [
      "Led deviation reduction and data centralization projects.",
      "Redesigned batch record flows to support digital transition.",
      "Built cloud automation tools using Power Automate and integrated workflows tracked via JIRA."
    ]
  }
];

export const metadata: Metadata = {
  title: "Resume",
  description: "Devin Otto's resume with text, preview, and PDF download."
};

export default function ResumePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${siteConfig.owner} Resume`,
    description: "Resume and career summary for Devin Otto.",
    url: `${siteConfig.siteUrl}/resume`
  };

  return (
    <main className="site-shell page-stack">
      <StructuredData data={jsonLd} />

      <section className="page-hero resume-hero">
        <div className="section-copy">
          <p className="eyebrow">Resume</p>
          <h1>My Resume.</h1>
          <p>
            This page gives you a quick read of my background while keeping the original PDF available for
            download or full-resolution viewing.
          </p>

          <div className="button-row">
            <a className="button" href={siteConfig.resumePath} target="_blank" rel="noreferrer">
              Open PDF
            </a>
            <a className="button button-ghost" href={siteConfig.resumePath} download>
              Download PDF
            </a>
            <Link className="button button-ghost" href="/#contact">
              Contact Devin
            </Link>
          </div>

          <div className="resume-at-a-glance">
            <div>
              <span className="metric-label">Location</span>
              <p>{siteConfig.location}</p>
            </div>
            <div>
              <span className="metric-label">Email</span>
              <p>{siteConfig.email}</p>
            </div>
            <div>
              <span className="metric-label">LinkedIn</span>
              <a href={siteConfig.linkedinUrl} target="_blank" rel="noreferrer">
                linkedin.com/in/devinjotto
              </a>
            </div>
          </div>
        </div>

        <article className="surface-card resume-sidebar">
          <div className="resume-preview-header">
            <p className="eyebrow">PDF preview</p>
            <span className="status-pill subtle">One page</span>
          </div>
          <figure className="resume-preview">
            <Image
              src="/resume/Devin_Otto_Resume-preview.png"
              alt="Preview of Devin Otto's resume"
              fill
              sizes="(max-width: 980px) 100vw, 520px"
              className="resume-preview-image"
              priority
            />
          </figure>
        </article>
      </section>

      <section className="section-stack">
        <div className="section-copy section-intro">
          <p className="eyebrow">Professional summary</p>
          <h2>AI, MLOps, and operational software experience.</h2>
        </div>

        <article className="surface-card">
          <div className="resume-summary-list">
            {summaryPoints.map((point) => (
              <p key={point}>{point}</p>
            ))}
          </div>
        </article>
      </section>

      <section className="section-stack">
        <div className="section-copy section-intro">
          <p className="eyebrow">Skills</p>
          <h2>Technical depth across model building, systems design, and deployment.</h2>
        </div>

        <div className="resume-skill-grid">
          {skills.map((skill) => (
            <article key={skill.title} className="surface-card">
              <h3>{skill.title}</h3>
              <p>{skill.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-stack">
        <div className="section-copy section-intro">
          <p className="eyebrow">Experience</p>
          <h2>Applied AI and systems work across biotech and manufacturing.</h2>
        </div>

        <div className="resume-experience-list">
          {experience.map((job) => (
            <article key={`${job.company}-${job.role}`} className="surface-card resume-role">
              <div className="project-topline">
                <div>
                  <h3>{job.company}</h3>
                  <p className="resume-role-title">{job.role}</p>
                </div>
                <div className="resume-role-meta">
                  <strong>{job.dates}</strong>
                  <span>{job.location}</span>
                </div>
              </div>
              <ul className="simple-list">
                {job.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="section-stack">
        <div className="section-copy section-intro">
          <p className="eyebrow">Education</p>
          <h2>University of California, Davis</h2>
        </div>

        <article className="surface-card">
          <div className="project-topline">
            <span className="status-pill subtle">Jan 2012 - Jan 2016</span>
            <span>UC Davis</span>
          </div>
          <h3>Bachelor of Arts, Plant Molecular Biology</h3>
          <p>Selected for the scientific foundation that now informs my work across AI, systems, and automation.</p>
        </article>
      </section>

      <section className="section-stack">
        <div className="section-copy section-intro">
          <p className="eyebrow">Text version</p>
          <h2>The resume text from the PDF, directly on the site.</h2>
        </div>

        <article className="surface-card resume-transcript-card">
          <pre className="resume-transcript">{resumeTranscript}</pre>
        </article>
      </section>
    </main>
  );
}
