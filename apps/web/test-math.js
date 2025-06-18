// Test the math preprocessing function
function preprocessMathContent(content) {
  // Pattern to match standalone LaTeX commands that aren't already wrapped in math delimiters
  const latexCommandPattern = /(?<!\$)\\(?:boxed|frac|sum|int|prod|lim|sqrt|text|mathbf|mathit|mathrm|operatorname|left|right|begin|end)\b[^$]*?(?:\{[^}]*\}|\[[^\]]*\])*(?!\$)/g;
  
  let processedContent = content;
  
  // Wrap standalone LaTeX commands
  processedContent = processedContent.replace(latexCommandPattern, (match) => {
    return `$${match}$`;
  });
  
  return processedContent;
}

// Test cases
const testCases = [
  "\\boxed{6:00 \\text{ AM the next day}}",
  "The answer is \\boxed{42}",
  "Already wrapped: $\\boxed{42}$",
  "Multiple: \\frac{a}{b} and \\sum_{i=1}^{n}",
  "Mixed: $\\frac{1}{2}$ and \\boxed{result}",
];

console.log("Testing math preprocessing:");
testCases.forEach((test, i) => {
  const result = preprocessMathContent(test);
  console.log(`${i + 1}. Input:  "${test}"`);
  console.log(`   Output: "${result}"`);
  console.log("");
});
