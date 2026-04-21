const createBtn = document.querySelector('.create-button');
const addForm = document.querySelector('.add-form');
const cancelBtn = document.querySelector('.add-form__btn-cancel');
const overlay = document.querySelector('.add-form__overlay');

const openForm = () => {
  addForm.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
const closeForm = () => {
  addForm.style.display = 'none';
  document.body.style.overflow = 'auto';
}

createBtn.addEventListener('click', openForm);
cancelBtn.addEventListener('click', closeForm);
overlay.addEventListener('click', closeForm);

let startY = 0;
let currentY = 0;
let isDragging = false;

addForm.addEventListener('touchstart', (e) => {
  startY = e.touches[0].clientY; 
  isDragging = true;
  
  addForm.style.transition = 'none'; 
});

addForm.addEventListener('touchmove', (e) => {
  if (!isDragging) return;

  currentY = e.touches[0].clientY;
  
  const deltaY = currentY - startY; 

  if (deltaY > 0) {
    addForm.style.transform = `translateY(${deltaY}px)`;
  }
});

addForm.addEventListener('touchend', () => {
  if (!isDragging) return;
  isDragging = false;

  const deltaY = currentY - startY;

  addForm.style.transition = 'transform 0.3s ease';

  if (deltaY > 100) {
    closeForm(); 
    
    setTimeout(() => {
      addForm.style.transform = 'translateY(0)';
    }, 300);

  } else {
    addForm.style.transform = 'translateY(0)';
  }
});