document.addEventListener('DOMContentLoaded', () => {
    console.log('Скрипт tests.js загружен!');

    // Проверка элементов
    const testButtons = document.querySelectorAll('.test-button');
    const selectionModal = document.getElementById('test-selection-modal');
    const testModal = document.getElementById('test-modal');
    const selectionCloseButton = selectionModal.querySelector('.close-button');
    const testCloseButton = testModal.querySelector('.close-button');
    const testTitle = document.getElementById('test-title');
    const testProgress = document.getElementById('test-progress');
    const testContent = document.getElementById('test-content');
    const submitButton = document.getElementById('submit-test');
    const testFeedback = document.getElementById('test-feedback');
    const errorDisplay = document.getElementById('error-display');

    if (!testButtons.length || !selectionModal || !testModal || !selectionCloseButton || !testCloseButton || !testTitle || !testProgress || !testContent || !submitButton || !testFeedback || !errorDisplay) {
        console.error('Не найдены элементы:', {
            testButtons: testButtons.length,
            selectionModal: !!selectionModal,
            testModal: !!testModal,
            selectionCloseButton: !!selectionCloseButton,
            testCloseButton: !!testCloseButton,
            testTitle: !!testTitle,
            testProgress: !!testProgress,
            testContent: !!testContent,
            submitButton: !!submitButton,
            testFeedback: !!testFeedback,
            errorDisplay: !!errorDisplay
        });
        errorDisplay.style.display = 'block';
        errorDisplay.innerHTML = 'Ошибка: Не найдены необходимые элементы страницы. Проверьте HTML.';
        return;
    }
    console.log('Найдено кнопок:', testButtons.length);

    let currentDictation = null;
    let currentTestType = null;
    let questions = [];
    let currentQuestionIndex = 0;
    let score = 0;

    // Функция для управления прокруткой
    function toggleScrollLock(lock) {
        document.body.classList.toggle('no-scroll', lock);
        console.log('Прокрутка фона:', lock ? 'заблокирована' : 'разблокирована');
    }

    // Функция для вывода ошибок
    function showError(message) {
        console.error(message);
        errorDisplay.style.display = 'block';
        errorDisplay.innerHTML = message;
    }

    // Загрузка JSON
    fetch('dictations.json')
        .then(response => {
            if (!response.ok) throw new Error('Не удалось загрузить dictations.json');
            return response.json();
        })
        .then(data => {
            const dictations = data.dictations;
            console.log('JSON загружен, найдено диктантов:', dictations.length);

            // Обработчик кнопок выбора теста
            testButtons.forEach(button => {
                button.addEventListener('click', () => {
                    console.log('Кнопка теста нажата:', button.parentElement.dataset.dictationId);
                    const dictationId = button.parentElement.dataset.dictationId;
                    currentDictation = dictations.find(d => d.id === dictationId);
                    if (!currentDictation) {
                        showError('Диктант не найден: ' + dictationId);
                        return;
                    }
                    selectionModal.style.display = 'block';
                    toggleScrollLock(true);
                });
            });

            // Обработчик выбора типа теста
            selectionModal.querySelectorAll('.test-option').forEach(option => {
                option.addEventListener('click', () => {
                    currentTestType = option.dataset.testType;
                    console.log('Выбран тест:', currentTestType);
                    if (currentDictation.id === 'dictation6' && currentTestType === 'formula-build') {
                        testFeedback.innerHTML = '<p style="color: #555;">Тест по сборке формулы в разработке.</p>';
                        selectionModal.style.display = 'none';
                        testModal.style.display = 'block';
                        testTitle.textContent = 'Тест по сборке формулы: ' + currentDictation.title;
                        testContent.innerHTML = '<p>Этот тест временно недоступен, так как находится в разработке.</p>';
                        testProgress.innerHTML = '';
                        submitButton.style.display = 'none';
                        toggleScrollLock(true);
                        return;
                    }
                    gtag('event', `${currentTestType}_test_started`, {
                        'dictation_id': currentDictation.id
                    });
                    selectionModal.style.display = 'none';
                    testTitle.textContent = `Тест ${getTestName(currentTestType)}: ${currentDictation.title}`;
                    questions = generateQuestions(currentDictation, currentTestType);
                    currentQuestionIndex = 0;
                    score = 0;
                    showQuestion();
                    testModal.style.display = 'block';
                    toggleScrollLock(true);
                });
            });

            // Закрытие модальных окон
            selectionCloseButton.addEventListener('click', () => {
                selectionModal.style.display = 'none';
                toggleScrollLock(false);
            });
            testCloseButton.addEventListener('click', () => {
                testModal.style.display = 'none';
                toggleScrollLock(false);
                resetTest();
            });
            window.addEventListener('click', (event) => {
                if (event.target === selectionModal) {
                    selectionModal.style.display = 'none';
                    toggleScrollLock(false);
                }
                if (event.target === testModal) {
                    testModal.style.display = 'none';
                    toggleScrollLock(false);
                    resetTest();
                }
            });

            // Название теста
            function getTestName(type) {
                switch (type) {
                    case 'formula': return 'по формулам';
                    case 'letter': return 'по буквам';
                    case 'formula-build': return 'по сборке формулы';
                    default: return '';
                }
            }

            // Генерация вопросов
            function generateQuestions(dictation, testType) {
                const formulas = dictation.formulas;
                if (!formulas || formulas.length === 0) {
                    showError('Формулы не найдены для диктанта: ' + dictation.id);
                    return [];
                }
                const selectedFormulas = [];
                while (selectedFormulas.length < Math.min(6, formulas.length)) {
                    const formula = formulas[Math.floor(Math.random() * formulas.length)];
                    if (!selectedFormulas.includes(formula)) {
                        selectedFormulas.push(formula);
                    }
                }

                if (testType === 'formula') {
                    return selectedFormulas.map(formula => ({
                        question: `Выберите правильную формулу для "${formula.name}":`,
                        correctAnswer: formula.formula,
                        description: formula.description,
                        wrongAnswers: getWrongAnswers(formulas, formula.formula, 'formula')
                    }));
                } else if (testType === 'letter') {
                    return selectedFormulas.map(formula => {
                        const variable = formula.variables[Math.floor(Math.random() * formula.variables.length)];
                        return {
                            question: `Что означает буква \\(${variable.symbol}\\)? И в чём она измеряется?`,
                            correctName: variable.meaning,
                            correctUnit: variable.unit,
                            wrongNames: getWrongAnswers(formulas, variable.meaning, 'name'),
                            wrongUnits: getWrongAnswers(formulas, variable.unit, 'unit')
                        };
                    });
                } else if (testType === 'formula-build') {
                    return selectedFormulas.map(formula => {
                        const isFraction = formula.formula.includes('\\frac');
                        const leftSide = formula.formula.split('=')[0].trim();
                        let numerator = [], denominator = [], linear = [];
                        let operators = [];
                        if (isFraction) {
                            const match = formula.formula.match(/\\frac\{([^}]*)\}\{([^}]*)\}/);
                            if (match) {
                                numerator = match[1].trim().replace(/\s*\*\s*/g, ' ').split(/\s+/).map(v => v.replace(/^\\Delta/, '∆'));
                                denominator = match[2].trim().replace(/\s*\*\s*/g, ' ').split(/\s+/).map(v => v.replace(/^\\Delta/, '∆'));
                            } else {
                                showError('Ошибка парсинга дробной формулы: ' + formula.formula);
                            }
                        } else {
                            const rightSide = formula.formula.split('=')[1].trim();
                            const parts = rightSide.replace(/\s*\*\s*/g, ' ').split(/\s+/);
                            linear = parts.filter(v => !['+', '-'].includes(v)).map(v => v.replace(/^\\Delta/, '∆'));
                            operators = parts.filter(v => ['+', '-'].includes(v));
                        }
                        const variables = [...new Set([...numerator, ...denominator, ...linear])].filter(v => v !== leftSide);
                        const shuffledVariables = [...variables].sort(() => Math.random() - 0.5);
                        return {
                            question: `Соберите формулу для "${formula.name}" (\\(${leftSide} = \\)):`,
                            isFraction,
                            correctNumerator: numerator,
                            correctDenominator: denominator,
                            correctLinear: linear,
                            operators: operators,
                            variables: shuffledVariables,
                            leftSide
                        };
                    });
                }
                return [];
            }

            // Генерация неправильных вариантов
            function getWrongAnswers(formulas, correctAnswer, type) {
                const wrongAnswers = [];
                const allValues = [];
                formulas.forEach(f => {
                    if (type === 'formula') {
                        allValues.push(f.formula);
                    } else if (type === 'name' || type === 'unit') {
                        f.variables.forEach(v => {
                            allValues.push(type === 'name' ? v.meaning : v.unit);
                        });
                    }
                });
                while (wrongAnswers.length < 3) {
                    const randomValue = allValues[Math.floor(Math.random() * allValues.length)];
                    if (randomValue !== correctAnswer && !wrongAnswers.includes(randomValue)) {
                        wrongAnswers.push(randomValue);
                    }
                }
                return wrongAnswers;
            }

            // Показ вопроса
            function showQuestion() {
                try {
                    if (currentQuestionIndex >= questions.length) {
                        testContent.innerHTML = `
                            <p>Тест завершён! Ваш результат: ${score}/${questions.length}</p>
                            <p>${score === questions.length ? 'Браво, физик! 🌟' : 'Неплохо, но попробуй ещё раз! 😏'}</p>
                        `;
                        testProgress.innerHTML = '';
                        testFeedback.innerHTML = '';
                        submitButton.style.display = 'none';
                        gtag('event', `${currentTestType}_test_completed`, {
                            'dictation_id': currentDictation.id,
                            'score': score,
                            'total_questions': questions.length
                        });
                        MathJax.typesetPromise().catch(err => showError('Ошибка рендеринга MathJax: ' + err.message));
                        toggleScrollLock(false);
                        return;
                    }

                    const question = questions[currentQuestionIndex];
                    testProgress.innerHTML = `Вопрос ${currentQuestionIndex + 1} из ${questions.length}`;
                    testFeedback.innerHTML = '';
                    submitButton.disabled = true;
                    submitButton.style.display = 'block';
                    errorDisplay.style.display = 'none';

                    if (currentTestType === 'formula') {
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
                        MathJax.typesetPromise().then(() => {
                            testContent.querySelectorAll('input[name="formula"]').forEach(input => {
                                input.addEventListener('change', () => {
                                    submitButton.disabled = false;
                                    console.log('Выбран вариант, кнопка активна');
                                });
                            });
                        }).catch(err => showError('Ошибка рендеринга MathJax: ' + err.message));
                    } else if (currentTestType === 'letter') {
                        const nameOptions = [question.correctName, ...question.wrongNames].sort(() => Math.random() - 0.5);
                        const unitOptions = [question.correctUnit, ...question.wrongUnits].sort(() => Math.random() - 0.5);
                        testContent.innerHTML = `
                            <p class="test-question">${question.question}</p>
                            <div class="test-options">
                                <p>Название:</p>
                                ${nameOptions.map((option, index) => `
                                    <label>
                                        <input type="radio" name="name" value="${option}" data-index="${index}">
                                        ${option}
                                    </label>
                                `).join('')}
                                <p>Единицы измерения:</p>
                                ${unitOptions.map((option, index) => `
                                    <label>
                                        <input type="radio" name="unit" value="${option}" data-index="${index}">
                                        ${option}
                                    </label>
                                `).join('')}
                            </div>
                        `;
                        MathJax.typesetPromise().then(() => {
                            testContent.querySelectorAll('input[name="name"], input[name="unit"]').forEach(input => {
                                input.addEventListener('change', () => {
                                    const nameSelected = testContent.querySelector('input[name="name"]:checked');
                                    const unitSelected = testContent.querySelector('input[name="unit"]:checked');
                                    submitButton.disabled = !(nameSelected && unitSelected);
                                    console.log('Выбраны название и единицы, кнопка активна:', !submitButton.disabled);
                                });
                            });
                        }).catch(err => showError('Ошибка рендеринга MathJax: ' + err.message));
                    }
                } catch (err) {
                    showError('Ошибка при показе вопроса: ' + err.message);
                }
            }

            // Обработчик ответа
            submitButton.onclick = (e) => {
                console.log('Обработчик submitButton.onclick вызван');
                try {
                    const question = questions[currentQuestionIndex];
                    let isCorrect = false;

                    if (currentTestType === 'formula') {
                        const selected = testContent.querySelector('input[name="formula"]:checked');
                        if (!selected) {
                            testFeedback.innerHTML = '<p style="color: red;">Выбери вариант, хитрец! 😜</p>';
                            console.log('Не выбран вариант в тесте по формулам');
                            return;
                        }
                        const userAnswer = selected.value;
                        isCorrect = userAnswer === question.correctAnswer;
                        if (isCorrect) {
                            score++;
                            testFeedback.innerHTML = '<p style="color: green;">Правильно! Ты молодец! 🚀</p>';
                        } else {
                            testFeedback.innerHTML = `
                                <p style="color: red;">Неправильно. 😢 Правильная формула:</p>
                                <p>\\(${question.correctAnswer}\\)</p>
                                <p>${question.description}</p>
                            `;
                            MathJax.typesetPromise().catch(err => showError('Ошибка рендеринга MathJax: ' + err.message));
                        }
                    } else if (currentTestType === 'letter') {
                        const nameSelected = testContent.querySelector('input[name="name"]:checked');
                        const unitSelected = testContent.querySelector('input[name="unit"]:checked');
                        if (!nameSelected || !unitSelected) {
                            testFeedback.innerHTML = '<p style="color: red;">Выбери оба ответа, хитрец! 😜</p>';
                            console.log('Не выбраны оба ответа в тесте по буквам');
                            return;
                        }
                        const nameAnswer = nameSelected.value;
                        const unitAnswer = unitSelected.value;
                        isCorrect = nameAnswer === question.correctName && unitAnswer === question.correctUnit;
                        if (isCorrect) {
                            score++;
                            testFeedback.innerHTML = '<p style="color: green;">Правильно! Ты молодец! 🚀</p>';
                        } else {
                            testFeedback.innerHTML = `
                                <p style="color: red;">Неправильно. 😢 Правильный ответ:</p>
                                <p>Название: ${question.correctName}</p>
                                <p>Единицы: ${question.correctUnit}</p>
                            `;
                        }
                    }

                    gtag('event', `${currentTestType}_test_answer_submitted`, {
                        'dictation_id': currentDictation.id,
                        'question_number': currentQuestionIndex + 1,
                        'is_correct': isCorrect
                    });

                    submitButton.disabled = true;
                    setTimeout(() => {
                        currentQuestionIndex++;
                        showQuestion();
                    }, 2000);
                } catch (err) {
                    showError('Ошибка в обработчике ответа: ' + err.message);
                }
            };

            // Вспомогательная функция для сравнения массивов
            function arraysEqual(a, b) {
                if (a.length !== b.length) {
                    console.log('Массивы разной длины:', a, b);
                    return false;
                }
                const sortedA = a.sort().join('');
                const sortedB = b.sort().join('');
                console.log('Сравнение массивов:', sortedA, sortedB);
                return sortedA === sortedB;
            }

            // Сброс теста
            function resetTest() {
                testContent.innerHTML = '';
                testProgress.innerHTML = '';
                testFeedback.innerHTML = '';
                testTitle.textContent = '';
                submitButton.disabled = true;
                submitButton.style.display = 'block';
                errorDisplay.style.display = 'none';
                questions = [];
                currentQuestionIndex = 0;
                score = 0;
                currentTestType = null;
            }
        })
        .catch(error => {
            showError('Ошибка загрузки JSON: ' + error.message);
            testContent.innerHTML = '<p>Ошибка загрузки данных! 😢</p>';
            submitButton.disabled = true;
        });
});