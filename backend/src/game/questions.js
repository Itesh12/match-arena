/**
 * Generates a random integer between min and max (inclusive).
 */
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random math question with options.
 */
function generateQuestion() {
  const operations = ['+', '-', '*', '/'];
  const op = operations[getRandomInt(0, operations.length - 1)];
  
  let a, b, correctAnswer;
  
  switch (op) {
    case '+':
      a = getRandomInt(1, 50);
      b = getRandomInt(1, 50);
      correctAnswer = a + b;
      break;
    case '-':
      a = getRandomInt(10, 100);
      b = getRandomInt(1, a); // Avoid negative results for simplicity
      correctAnswer = a - b;
      break;
    case '*':
      a = getRandomInt(1, 12);
      b = getRandomInt(1, 12);
      correctAnswer = a * b;
      break;
    case '/':
      b = getRandomInt(1, 12);
      correctAnswer = getRandomInt(1, 12);
      a = b * correctAnswer; // Ensure integer division
      break;
  }

  const questionText = `${a} ${op} ${b}`;
  
  // Generate 3 distractors
  const options = new Set();
  options.add(correctAnswer);
  
  while (options.size < 4) {
    const distractor = correctAnswer + getRandomInt(-10, 10);
    if (distractor !== correctAnswer && distractor >= 0) {
      options.add(distractor);
    }
  }

  return {
    question: questionText,
    options: Array.from(options).sort(() => Math.random() - 0.5),
    correctAnswer
  };
}

module.exports = { generateQuestion };
