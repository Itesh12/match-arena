/**
 * Generates a random integer between min and max (inclusive).
 */
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random math question with options.
 */
function generateQuestion(difficulty = 'medium') {
  const operations = ['+', '-', '*', '/'];
  const op = operations[getRandomInt(0, operations.length - 1)];
  
  let a, b, correctAnswer;
  
  // Difficulty scaling
  const config = {
    easy: { addMax: 20, subMax: 30, multMax: 6, divMax: 6 },
    medium: { addMax: 50, subMax: 100, multMax: 12, divMax: 12 },
    hard: { addMax: 200, subMax: 500, multMax: 25, divMax: 20 }
  }[difficulty] || { addMax: 50, subMax: 100, multMax: 12, divMax: 12 };

  switch (op) {
    case '+':
      a = getRandomInt(1, config.addMax);
      b = getRandomInt(1, config.addMax);
      correctAnswer = a + b;
      break;
    case '-':
      a = getRandomInt(10, config.subMax);
      b = getRandomInt(1, a); 
      correctAnswer = a - b;
      break;
    case '*':
      a = getRandomInt(1, config.multMax);
      b = getRandomInt(1, config.multMax);
      correctAnswer = a * b;
      break;
    case '/':
      b = getRandomInt(1, config.divMax);
      correctAnswer = getRandomInt(1, config.divMax);
      a = b * correctAnswer; 
      break;
  }

  const questionText = `${a} ${op} ${b}`;
  
  // Generate 3 distractors
  const options = new Set();
  options.add(correctAnswer);
  
  const range = difficulty === 'hard' ? 20 : 10;
  while (options.size < 4) {
    const distractor = correctAnswer + getRandomInt(-range, range);
    if (distractor !== correctAnswer && (distractor >= 0 || op === '-')) {
      options.add(distractor);
    }
  }

  return {
    question: questionText,
    options: Array.from(options).sort(() => Math.random() - 0.5),
    answer: correctAnswer
  };
}

module.exports = { generateQuestion };
