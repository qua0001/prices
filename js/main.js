const createBtn = document.querySelector(".create-button");
const addForm = document.querySelector(".add-form");
const cancelBtn = document.querySelector(".add-form__btn-cancel");
const overlay = document.querySelector(".add-form__overlay");
const toggleBtn = document.querySelector(".add-form__toggle-btn");
const inputField = document.querySelector("#add-category");
const selectField = document.querySelector("#product-category");
const addFormElement = document.querySelector(".add-form form");
const productList = document.querySelector(".product-list");
const emptyState = document.querySelector(".empty-state");
const formContent = document.querySelector(".add-form__content");

const openForm = () => {
  addForm.style.display = "flex";
  document.body.style.overflow = "hidden";
  formContent.style.transform = "translateY(0)";
};

const closeForm = () => {
  addForm.style.display = "none";
  document.body.style.overflow = "auto";

  const form = addForm.querySelector("form");
  if (form) form.reset();

  inputField.classList.add("is-hidden");
  inputField.style.display = "none";
  inputField.disabled = true;
  selectField.classList.remove("is-hidden");
  selectField.disabled = false;
  toggleBtn.textContent = "+ Добавить новую категорию";
};

createBtn.addEventListener("click", openForm);
cancelBtn.addEventListener("click", closeForm);
overlay.addEventListener("click", closeForm);

toggleBtn.addEventListener("click", () => {
  const isHidden = inputField.classList.contains("is-hidden");

  if (isHidden) {
    inputField.classList.remove("is-hidden");
    inputField.style.display = "block";
    inputField.disabled = false;
    inputField.focus();
    selectField.classList.add("is-hidden");
    selectField.disabled = true;
    toggleBtn.textContent = "Назад к выбору";
  } else {
    inputField.classList.add("is-hidden");
    inputField.style.display = "none";
    inputField.disabled = true;
    selectField.classList.remove("is-hidden");
    selectField.disabled = false;
    toggleBtn.textContent = "+ Добавить новую категорию";
  }
});

const renderProduct = (product) => {
  if (emptyState) emptyState.style.display = "none";

  let categorySection = document.querySelector(
    `.category-section[data-category="${product.category}"]`,
  );

  if (!categorySection) {
    const sectionHtml = `
      <section class="category-section" data-category="${product.category}">
        <h2 class="category-section__title">${product.category}</h2>
        <div class="category-section__list"></div>
      </section>
    `;
    productList.insertAdjacentHTML("beforeend", sectionHtml);
    categorySection = document.querySelector(
      `.category-section[data-category="${product.category}"]`,
    );
  }

  const productHtml = `
    <div class="product-card" data-id="${product.id}">
      <div class="product-card__info">
        <h3 class="product-card__name">${product.title}</h3>
      </div>
      <div class="product-card__price">${product.price} ₽ <span style="font-size: 12px; color: #888; font-weight: normal;">/ ${product.priceType}</span></div>
      <button class="product-card__menu-btn">⋮</button>
    </div>
  `;

  const listContainer = categorySection.querySelector(
    ".category-section__list",
  );
  listContainer.insertAdjacentHTML("afterbegin", productHtml);
};

addFormElement.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(addFormElement);

  const customCat = formData.get("custom-category");
  const selectedCat = formData.get("product-category");
  const category =
    customCat && customCat.trim() !== "" ? customCat : selectedCat;

  const product = {
    id: Date.now(),
    title: formData.get("product-name"),
    price: formData.get("product-price"),
    priceType: formData.get("price-type"),
    category: category || "Без категории",
    isBought: false,
  };

  renderProduct(product);
  closeForm();
});

document.addEventListener("click", (e) => {
  const menuBtn = e.target.closest(".product-card__menu-btn");

  document.querySelectorAll(".product-menu").forEach((m) => m.remove());

  if (menuBtn) {
    const card = menuBtn.closest(".product-card");
    const productId = card.dataset.id;

    const menuHtml = `
      <div class="product-menu is-active">
        <div class="product-menu__item">✎ Редактировать</div>
        <div class="product-menu__item">⇄ Перенести</div>
        <div class="product-menu__item product-menu__item--delete">🗑 Удалить</div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", menuHtml);
    const menu = document.querySelector(".product-menu");

    const rect = menuBtn.getBoundingClientRect();
    menu.style.position = "fixed";
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.left = `${rect.left - 120}px`;
  }
});
