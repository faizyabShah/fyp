// utils/textFormatter.js
export const formatText = (text) => {
    // Convert **bold text** to <strong>bold text</strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convert * bullet points to <li> items in a <ul>
    text = text.replace(/^\*\s+/gm, '<li>'); // Start of a bullet point
    text = text.replace(/<\/li>\s*$/gm, '</li>'); // End of a bullet point
    
    // Wrap <li> items in a <ul>
    text = text.replace(/<li>(.*?)<\/li>/g, '<ul><li>$1</li></ul>');

    // Remove extra <ul> tags if they are nested incorrectly
    text = text.replace(/(<ul>\s*<li>)(.*?)(<\/li>\s*<\/ul>)/g, '$1$2$3');

    // Handle new lines: replace double newlines with <p> tags
    text = text.split('\n\n').map(paragraph => {
        return `<p>${paragraph.trim().replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return text;
};
