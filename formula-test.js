document.addEventListener('DOMContentLoaded', () => {
    console.log('Скрипт formula-test.js загружен!');

    // Проверка элементов
    const buttons = document.querySelectorAll('.formula-test-button');
    const modal = document.getElementById('formula-test-modal');
    const closeButton = document.querySelector('.close-button');
    const testTitle = document.getElementById('test-title');
    const testProgress = document.getElementById('test-progress');
    const testContent = document.getElementById('test-content');
    const submitButton = document.getElementById('submit-formula');
    const testFeedback = document.getElementById('test-feedback');

    if (!buttons.length || !modal || !closeButton || !testTitle || !testProgress || !testContent || !submitButton || !testFeedback) {
        console.error('Не найдены элементы:', {
            buttons: buttons.length,
            modal: !!modal,
            closeButton: !!closeButton,
            testTitle: !!testTitle,
            testProgress: !!testProgress,
            testContent: !!testContent,
            submitButton: !!submitButton,
            testFeedback: !!testFeedback
        });
        return;
    }
    console.log('Найдено кнопок:', buttons.length);

    let currentDictation = null;
    let questions = [];
    let currentQuestionIndex = 0;
    let score = 0;

    // Загрузка JSON
    fetch('dictations.json')
        .then(response => {
            if (!response.ok) throw new Error('Не удалось загрузить dictations.json');
            return response.json();
        })
        .then(data => {
            const dictations = data.dictations;
            console.log('JSON загружен, найдено диктантов:', dictations.length);

            // Обработчик кнопок с событием GA4
            buttons.forEach(button => {
                button.addEventListener('click', () => {
                    console.log('Кнопка нажата:', button.parentElement.dataset.dictationId);
                    const dictationId = button.parentElement.dataset.dictationId;
                    currentDictation = dictations.find(d => d.id === dictationId);
                    if (!currentDictation) {
                        console.error('Диктант не найден:', dictationId);
                        return;
                    }
                    // Отправляем событие test_started
                    gtag('event', 'test_started', {
                        'dictation_id': dictationId
                    });
                    testTitle.textContent = `Тест по формулам: ${currentDictation.title}`;
                    questions = generateQuestions(currentDictation);
                    currentQuestionIndex = 0;
                    score = 0;
                    showQuestion();
                    modal.style.display = 'block';
                });
            });

            // Закрытие модального окна
            closeButton.addEventListener('click', () => {
                modal.style.display = 'none';
                resetTest();
            });

            // Закрытие при клике вне модального окна
            window.addEventListener('click', (event) => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                    resetTest();
                }
            });

            // Генерация 6 случайных вопросов
            function generateQuestions(dictation) {
                const formulas = dictation.formulas;
                if (!formulas || formulas.length === 0) return [];
                const selectedFormulas = [];
                while (selectedFormulas.length < Math.min(6, formulas.length)) {
                    const formula = formulas[Math.floor(Math.random() * formulas.length)];
                    if (!selectedFormulas.includes(formula)) {
                        selectedFormulas.push(formula);
                    }
                }
                return selectedFormulas.map(formula => ({
                    question: `Выберите правильную формулу для "${formula.name}":`,
                    correctAnswer: formula.formula,
                    description: formula.description,
                    wrongAnswers: getWrongAnswers(formulas, formula.formula)
                }));
            }

            // Генерация неправильных вариантов
            function getWrongAnswers(formulas, correctAnswer) {
                const wrongAnswers = [];
                while (wrongAnswers.length < 3) {
                    const randomFormula = formulas[Math.floor(Math.random() * formulas.length)].formula;
                    if (randomFormula !== correctAnswer && !wrongAnswers.includes(randomFormula)) {
                        wrongAnswers.push(randomFormula);
                    }
                }
                return wrongAnswers;
            }

            // Показ вопроса
            function showQuestion() {
                if (currentQuestionIndex >= questions.length) {
                    testContent.innerHTML = `
                        <p>Тест завершён! Ваш результат: ${score}/${questions.length}</p>
                        <p>${score === questions.length ? 'Браво, физик-гуру! 🌟' : 'Неплохо, но попробуй ещё раз! 😏'}</p>
                    `;
                    testProgress.innerHTML = '';
                    testFeedback.innerHTML = '';
                    submitButton.style.display = 'none';
                    // Отправляем событие test_completed
                    gtag('event', 'test_completed', {
                        'dictation_id': currentDictation.id,
                        'score': score,
                        'total_questions': questions.length
                    });
                    MathJax.typeset();
                    return;
                }

                const question = questions[currentQuestionIndex];
                const options = [question.correctAnswer, ...question.wrongAnswers].sort(() => Math.random() - 0.5);

                testContent.innerHTML = `
                    <p class="test-question">${question.question}</p>
                    <div class="test-options">
                        ${options.map((option, index) => `
                            <label>
                                <input type="radio" name="formula" value="${option}" data-index="${index}">
                                <span class="formula-option">\\(${option}\\)</span>
                            </label>
                        `).join('')}
                    </div>
                `;
                testProgress.innerHTML = `Вопрос ${currentQuestionIndex + 1} из ${questions.length}`;
                testFeedback.innerHTML = '';
                submitButton.disabled = false;
                submitButton.style.display = 'block';

                MathJax.typeset();
            }

            // Обработчик ответа с событием GA4
            submitButton.onclick = () => {
                const selected = testContent.querySelector('input[name="formula"]:checked');
                if (!selected) {
                    testFeedback.innerHTML = '<p style="color: red;">Выбери вариант, хитрец! 😜</p>';
                    return;
                }

                const userAnswer = selected.value;
                const question = questions[currentQuestionIndex];
                const isCorrect = userAnswer === question.correctAnswer;
                // Отправляем событие test_answer_submitted
                gtag('event', 'test_answer_submitted', {
                    'dictation_id': currentDictation.id,
                    'question_number': currentQuestionIndex + 1,
                    'is_correct': isCorrect
                });

                if (isCorrect) {
                    score++;
                    testFeedback.innerHTML = '<p style="color: green;">Правильно! Ты молодец! 🚀</p>';
                } else {
                    testFeedback.innerHTML = `
                        <p style="color: red;">Неправильно. 😢 Правильная формула:</p>
                        <p>\\(${question.correctAnswer}\\)</p>
                        <p>${question.description}</p>
                    `;
                    MathJax.typeset();
                }

                submitButton.disabled = true;
                setTimeout(() => {
                    currentQuestionIndex++;
                    showQuestion();
                }, 2000);
            };

            // Сброс теста
            function resetTest() {
                testContent.innerHTML = '';
                testProgress.innerHTML = '';
                testFeedback.innerHTML = '';
                testTitle.textContent = '';
                submitButton.disabled = true;
                submitButton.style.display = 'block';
                questions = [];
                currentQuestionIndex = 0;
                score = 0;
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки JSON:', error);
            testContent.innerHTML = '<p>Ошибка загрузки данных! 😢</p>';
            submitButton.disabled = true;
        });
});