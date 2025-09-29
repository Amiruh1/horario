 document.addEventListener('DOMContentLoaded', function() {
            // Generar las horas en la tabla
            const scheduleBody = document.querySelector('#scheduleTable tbody');
            const hours = [];
            
            // Crear horas de 7:00 a 22:00 (formato 24 horas)
            for (let i = 7; i <= 22; i++) {
                hours.push(`${i}:00`);
            }
            
            // Generar las filas de la tabla
            hours.forEach(time => {
                const row = document.createElement('tr');
                
                // Añadir clase especial para las horas de la tarde/noche
                const hourPart = parseInt(time.split(':')[0]);
                if (hourPart >= 18) {
                    row.classList.add('evening-row');
                }
                
                const timeCell = document.createElement('td');
                timeCell.className = 'time-column';
                timeCell.textContent = time;
                
                row.appendChild(timeCell);
                
                // Crear celdas para cada día (6 días ahora, incluyendo sábado)
                for (let i = 0; i < 6; i++) {
                    const cell = document.createElement('td');
                    cell.className = 'course-slot';
                    cell.dataset.time = time;
                    cell.dataset.day = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][i];
                    cell.innerHTML = '<div class="empty-slot">Disponible</div>';
                    row.appendChild(cell);
                }
                
                scheduleBody.appendChild(row);
            });
            
            // Almacenamiento de cursos
            let courses = JSON.parse(localStorage.getItem('courses')) || [];
            
            // Función para mostrar alertas
            function showAlert(alertId, message = '') {
                if (message) {
                    document.getElementById('errorMessage').textContent = message;
                }
                const alert = document.getElementById(alertId);
                alert.style.display = 'block';
                
                setTimeout(() => {
                    alert.style.display = 'none';
                }, 3000);
            }
            
            // Función para renderizar los cursos en el horario
            function renderCourses() {
                // Limpiar todas las celdas primero
                document.querySelectorAll('.course-slot').forEach(cell => {
                    cell.innerHTML = '<div class="empty-slot">Disponible</div>';
                    cell.rowSpan = 1;
                    cell.classList.remove('hidden-cell');
                });
                
                // Agregar los cursos
                courses.forEach(course => {
                    const { name, classroom, day, startTime, endTime, color, id } = course;
                    
                    // Convertir horas a formato numérico para comparación
                    const [startH, startM] = startTime.split(':').map(Number);
                    const [endH, endM] = endTime.split(':').map(Number);
                    
                    const startTotalMinutes = startH * 60 + startM;
                    const endTotalMinutes = endH * 60 + endM;
                    
                    // Calcular duración en horas (redondeado hacia arriba)
                    const durationHours = Math.ceil((endTotalMinutes - startTotalMinutes) / 60);
                    
                    // Encontrar las celdas correspondientes
                    const cells = document.querySelectorAll(`.course-slot[data-day="${day}"]`);
                    
                    let firstCell = null;
                    let cellsToCombine = [];
                    
                    cells.forEach(cell => {
                        let cellTime = cell.dataset.time;
                        // Convertir a formato numérico para comparación
                        let [cellH, cellM] = cellTime.split(':').map(Number);
                        
                        const cellTotalMinutes = cellH * 60 + cellM;
                        const nextCellTotalMinutes = cellTotalMinutes + 60;
                        
                        // Verificar si esta celda está dentro del rango del curso
                        if (cellTotalMinutes < endTotalMinutes && nextCellTotalMinutes > startTotalMinutes) {
                            if (!firstCell) {
                                firstCell = cell;
                            }
                            cellsToCombine.push(cell);
                        }
                    });
                    
                    // Combinar celdas si el curso ocupa más de una hora
                    if (cellsToCombine.length > 1 && firstCell) {
                        // Ocultar todas las celdas excepto la primera
                        for (let i = 1; i < cellsToCombine.length; i++) {
                            cellsToCombine[i].classList.add('hidden-cell');
                        }
                        
                        // Establecer rowspan en la primera celda
                        firstCell.rowSpan = cellsToCombine.length;
                        
                        // Mostrar el curso en la celda combinada
                        firstCell.innerHTML = `
                            <div class="course-item" style="background-color: ${color}; height: ${cellsToCombine.length * 70 - 16}px;">
                                <button class="delete-btn" data-id="${id}">
                                    <i class="fas fa-times"></i>
                                </button>
                                <div class="course-info">
                                    <div class="course-time">${startTime} - ${endTime}</div>
                                    <div class="course-name">${name}</div>
                                    <div class="course-details">Aula: ${classroom}</div>
                                </div>
                            </div>
                        `;
                    } else if (firstCell) {
                        // Curso de una sola hora
                        firstCell.innerHTML = `
                            <div class="course-item" style="background-color: ${color};">
                                <button class="delete-btn" data-id="${id}">
                                    <i class="fas fa-times"></i>
                                </button>
                                <div class="course-info">
                                    <div class="course-time">${startTime} - ${endTime}</div>
                                    <div class="course-name">${name}</div>
                                    <div class="course-details">Aula: ${classroom}</div>
                                </div>
                            </div>
                        `;
                    }
                });
                
                // Agregar event listeners a los botones de eliminar
                document.querySelectorAll('.delete-btn').forEach(btn => {
                    btn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const courseId = this.dataset.id;
                        deleteCourse(courseId);
                    });
                });
            }
            
            // Función para agregar un nuevo curso
            function addCourse() {
                const name = document.getElementById('courseName').value;
                const classroom = document.getElementById('classroom').value;
                const day = document.getElementById('daySelect').value;
                
                // Obtener hora y minutos por separado
                const startHour = document.getElementById('startHour').value;
                const startMinute = document.getElementById('startMinute').value;
                const endHour = document.getElementById('endHour').value;
                const endMinute = document.getElementById('endMinute').value;
                
                // Formatear la hora completa
                const startTime = `${startHour.padStart(2, '0')}:${startMinute.padStart(2, '0')}`;
                const endTime = `${endHour.padStart(2, '0')}:${endMinute.padStart(2, '0')}`;
                
                const color = document.getElementById('courseColor').value;
                
                if (!name || !classroom) {
                    showAlert('errorAlert', 'Por favor, complete todos los campos');
                    return;
                }
                
                // Validar horas
                const [startH, startM] = startTime.split(':').map(Number);
                const [endH, endM] = endTime.split(':').map(Number);
                
                const startTotalMinutes = startH * 60 + startM;
                const endTotalMinutes = endH * 60 + endM;
                
                if (startTotalMinutes >= endTotalMinutes) {
                    showAlert('errorAlert', 'La hora de inicio debe ser anterior a la hora de fin');
                    return;
                }
                
                // Validar que no pase de las 10:00 PM (22:00)
                if (endH > 22 || (endH === 22 && endM > 0)) {
                    showAlert('errorAlert', 'El horario no puede extenderse más allá de las 22:00');
                    return;
                }
                
                const newCourse = {
                    id: Date.now(), // ID único basado en timestamp
                    name,
                    classroom,
                    day,
                    startTime,
                    endTime,
                    color
                };
                
                courses.push(newCourse);
                localStorage.setItem('courses', JSON.stringify(courses));
                renderCourses();
                
                // Mostrar mensaje de éxito
                showAlert('successAlert');
                
                // Limpiar el formulario
                document.getElementById('courseName').value = '';
                document.getElementById('classroom').value = '';
            }
            
            // Función para eliminar un curso
            function deleteCourse(courseId) {
                if (confirm('¿Está seguro de que desea eliminar este curso?')) {
                    courses = courses.filter(course => course.id !== parseInt(courseId));
                    localStorage.setItem('courses', JSON.stringify(courses));
                    renderCourses();
                }
            }
            
            // Función para guardar como imagen
            function saveAsImage() {
                html2canvas(document.getElementById('scheduleTable')).then(canvas => {
                    const link = document.createElement('a');
                    link.download = 'mi-horario.jpg';
                    link.href = canvas.toDataURL('image/jpeg', 0.9);
                    link.click();
                });
                clearAllCourses()
            }
            
            // Función para eliminar todos los cursos
            function clearAllCourses() {
                if (confirm('¿Está seguro de que desea eliminar todos los cursos?')) {
                    courses = [];
                    localStorage.setItem('courses', JSON.stringify(courses));
                    renderCourses();
                }
            }
            
            // Event Listeners
            document.getElementById('addCourse').addEventListener('click', addCourse);
            document.getElementById('saveBtn').addEventListener('click', saveAsImage);
            document.getElementById('clearBtn').addEventListener('click', clearAllCourses);
            
            // Renderizar cursos al cargar la página
            renderCourses();
        });