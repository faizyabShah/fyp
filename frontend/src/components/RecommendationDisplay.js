import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/RecommendationDisplay.css'; // Import the separate CSS file

const RecommendationDisplay = ({ reportContent }) => {
  if (!reportContent) {
    return (
      <div className="card border-light p-4 text-center">
        <p className="text-muted">No content to display.</p>
      </div>
    );
  }

  // 1. Remove any <think>...</think> block if present
  const thinkRegex = /<think>[\s\S]*?<\/think>/;
  const mainContent = reportContent.replace(thinkRegex, '').trim();

  // 2. Replace escape sequences with actual characters
  const replacedContent = mainContent
    .replace(/\\n/g, '\n')
    .replace(/\\u2013/g, '–') // Replace \u2013 with en dash
    .replace(/\\u2023/g, '-') // Replace \u2023 with hyphen
    .replace(/\\u201([0-9])/g, (match, p1) => {
      // Handle \u2010 to \u2019 range (various dashes and quotes)
      return String.fromCharCode(parseInt('201' + p1, 16));
    });

  // Custom component to handle sections with green borders
  const SectionWrapper = ({ children }) => {
    // Only add the section-content class if it's not a heading
    if (React.isValidElement(children) && 
        (children.type === 'h1' || children.type === 'h2' || 
         children.type === 'h3' || children.type === 'h4')) {
      return children;
    }
    return <div className="section-content">{children}</div>;
  };

  // 3. Define custom components with Bootstrap classes
  const mdComponents = {
    h1: ({ node, ...props }) => (
      <h1 className="display-4 pb-2 mb-4 border-bottom heading-marker" {...props} />
    ),
    h2: ({ node, ...props }) => (
      <h2 className="display-5 mb-3 mt-4 heading-marker" {...props} />
    ),
    h3: ({ node, ...props }) => (
      <h3 className="h3 mb-3 mt-4 heading-marker" {...props} />
    ),
    h4: ({ node, ...props }) => (
      <h4 className="h4 mb-2 mt-3 heading-marker" {...props} />
    ),
    p: ({ node, ...props }) => (
      <SectionWrapper>
        <p className="p lead mb-3" {...props} />
      </SectionWrapper>
    ),
    ul: ({ node, ...props }) => (
      <SectionWrapper>
        <ul className="list-group list-group-flush mb-4" {...props} />
      </SectionWrapper>
    ),
    ol: ({ node, ...props }) => (
      <SectionWrapper>
        <ol className="ps-4 mb-4" {...props} />
      </SectionWrapper>
    ),
    li: ({ node, ...props }) => (
      <li className="li list-group-item border-0 ps-2" {...props} />
    ),
    strong: ({ node, ...props }) => (
      <strong className="fw-bold" {...props} />
    ),
    em: ({ node, ...props }) => (
      <em className="fst-italic" {...props} />
    ),
    blockquote: ({ node, ...props }) => (
      <SectionWrapper>
        <blockquote className="blockquote bg-light p-3 border-start border-4 border-primary rounded-end mb-4" {...props} />
      </SectionWrapper>
    ),
    a: ({ node, ...props }) => (
      <a className="link-primary text-decoration-none" {...props} />
    ),
    code: ({ node, inline, className, children, ...props }) => {
      return inline ? (
        <code className="bg-light px-1 py-1 rounded text-danger" {...props}>
          {String(children)}
        </code>
      ) : (
        <SectionWrapper>
          <div className="bg-light rounded p-3 mb-4">
            <pre className="mb-0">
              <code className={`${className || ''}`} {...props}>
                {String(children)}
              </code>
            </pre>
          </div>
        </SectionWrapper>
      );
    },
    pre: ({ node, ...props }) => null, // Handle pre inside code component
    hr: ({ node, ...props }) => (
      <hr className="my-4" {...props} />
    ),
    table: ({ node, ...props }) => (
      <SectionWrapper>
        <div className="table-responsive mb-4">
          <table className="table table-striped table-bordered" {...props} />
        </div>
      </SectionWrapper>
    ),
    thead: ({ node, ...props }) => (
      <thead className="table-light" {...props} />
    ),
    th: ({ node, ...props }) => (
      <th scope="col" {...props} />
    ),
    td: ({ node, ...props }) => (
      <td {...props} />
    ),
    img: ({ node, ...props }) => (
      <SectionWrapper>
        <img className="img-fluid rounded my-4" {...props} alt={props.alt || "Image"} />
      </SectionWrapper>
    ),
  };

  return (
    <div className="card card-recommendation border-0 p-4 mb-4">
      <div className="card-body markdown-content">
        <ReactMarkdown components={mdComponents} remarkPlugins={[remarkBreaks]}>
          {replacedContent}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default RecommendationDisplay;