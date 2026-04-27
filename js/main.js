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

let editingProductId = null;

const openForm = () => {
  addForm.style.display = "flex";
  document.body.style.overflow = "hidden";

  document.querySelector(".add-form__title").textContent = "Новый товар";
  document.querySelector(".add-form__btn-submit").textContent = "Добавить";
  editingProductId = null;
};

const closeForm = () => {
  addForm.style.display = "none";
  document.body.style.overflow = "auto";
  if (addFormElement) addFormElement.reset();

  inputField.classList.add("is-hidden");
  inputField.style.display = "none";
  inputField.disabled = true;
  selectField.classList.remove("is-hidden");
  selectField.disabled = false;
  toggleBtn.textContent = "+ Добавить новую категорию";

  selectField.disabled = false;
  toggleBtn.style.display = 'block';
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

window.ensureCategory = (categoryName) => {
  let categorySection = document.querySelector(
    `.category-section[data-category="${categoryName}"]`,
  );

  if (!categorySection) {
    const sectionHtml = `
      <section class="category-section" data-category="${categoryName}">
        <div class="category-section__header" style="display: flex; justify-content: space-between; align-items: center;">
          <h2 class="category-section__title">${categoryName}</h2>
          <button class="category-section__menu-btn" onclick="openCategoryMenu(event, '${categoryName}')">⋮</button>
        </div>
        <div class="category-section__list"></div>
      </section>
    `;
    productList.insertAdjacentHTML("beforeend", sectionHtml);
    emptyState.style.display = "none";
    categorySection = document.querySelector(
      `.category-section[data-category="${categoryName}"]`,
    );
  }
  return categorySection;
};

const renderProduct = (product) => {
  const categorySection = ensureCategory(product.category);
  const listContainer = categorySection.querySelector(
    ".category-section__list",
  );

  const productHtml = `
    <div class="product-card" data-id="${product.id}">
      <div class="product-card__info">
        <h3 class="product-card__name">${product.title}</h3>
      </div>
      <div class="product-card__price">${product.price} ₽ <span class="product-card__unit">/ ${product.priceUnit}</span></div>
      <button class="product-card__menu-btn">⋮</button>
    </div>
  `;
  listContainer.insertAdjacentHTML("afterbegin", productHtml);
};

addFormElement.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(addFormElement);

  const customCat = formData.get("custom-category");
  const selectedCat = formData.get("product-category");
  const category =
    customCat && customCat.trim() !== "" ? customCat : selectedCat;

  const productData = {
    title: formData.get("product-name"),
    price: formData.get("product-price"),
    priceUnit: formData.get("price-unit"),
    category: category || "Без категории",
  };

  if (editingProductId) {
    const oldCard = document.querySelector(
      `.product-card[data-id="${editingProductId}"]`,
    );
    const oldCategory = oldCard.closest(".category-section").dataset.category;

    if (oldCategory === productData.category) {
      oldCard.querySelector(".product-card__name").textContent =
        productData.title;
      oldCard.querySelector(".product-card__price").childNodes[0].textContent =
        `${productData.price} ₽ `;
      oldCard.querySelector(".product-card__unit").textContent =
        `/ ${productData.priceUnit}`;
    } else {
      deleteProduct(editingProductId);
      renderProduct({ id: editingProductId, ...productData });
    }
  } else {
    renderProduct({ id: Date.now(), ...productData });
  }

  closeForm();
});

document.addEventListener("click", (e) => {
  const menuBtn = e.target.closest(".product-card__menu-btn");
  const existingMenu = document.querySelector(".product-menu");

  if (existingMenu) {
    const isSameBtn =
      menuBtn &&
      menuBtn.closest(".product-card").dataset.id === existingMenu.dataset.for;
    existingMenu.remove();

    if (isSameBtn) return;
  }

  if (menuBtn) {
    const card = menuBtn.closest(".product-card");
    const productId = card.dataset.id;

    const menuHtml = `
      <div class="product-menu is-active" data-for="${productId}">
        <div class="product-menu__item" onclick="editProduct('${productId}')">✎ Редактировать</div>
        <div class="product-menu__item" onclick="moveProduct('${productId}')">⇄ Перенести</div>
        <div class="product-menu__item product-menu__item--delete" onclick="deleteProduct('${productId}')">🗑 Удалить</div>
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

window.deleteProduct = (id) => {
  if (!confirm("Удалить этот товар?")) return;

  const card = document.querySelector(`.product-card[data-id="${id}"]`);
  if (card) card.remove();

  if (
    document.querySelectorAll(".product-card").length === 0 &&
    document.querySelectorAll(".category-section").length === 0
  ) {
    emptyState.style.display = "flex";
  }
  document.querySelector(".product-menu")?.remove();
};

window.editProduct = (id) => {
  const card = document.querySelector(`.product-card[data-id="${id}"]`);
  const name = card.querySelector(".product-card__name").textContent;
  const priceText = card.querySelector(".product-card__price").textContent;
  const price = parseInt(priceText);

  const unitText = card
    .querySelector(".product-card__unit")
    .textContent.replace("/", "")
    .trim();

  const category = card.closest(".category-section").dataset.category;

  editingProductId = id;

  openForm();

  document.querySelector("#product-name").value = name;
  document.querySelector("#product-price").value = price;

  const radioToSelect = document.querySelector(
    `input[name="price-unit"][value="${unitText}"]`,
  );
  if (radioToSelect) radioToSelect.checked = true;

  const optionToSelect = Array.from(selectField.options).find(
    (opt) => opt.value === category,
  );

  if (optionToSelect) {
    selectField.value = category;
    inputField.classList.add("is-hidden");
    inputField.style.display = "none";
    inputField.disabled = true;
    selectField.classList.remove("is-hidden");
    selectField.disabled = false;
    toggleBtn.textContent = "+ Добавить новую категорию";
  } else {
    inputField.value = category;
    inputField.classList.remove("is-hidden");
    inputField.style.display = "block";
    inputField.disabled = false;
    selectField.classList.add("is-hidden");
    selectField.disabled = true;
    toggleBtn.textContent = "Назад к выбору";
  }

  document.querySelector(".add-form__title").textContent = "Редактирование";
  document.querySelector(".add-form__btn-submit").textContent = "Сохранить";

  document.querySelector(".product-menu")?.remove();
};

window.moveProduct = (id) => {
  productToMove = id;
  const card = document.querySelector(`.product-card[data-id="${id}"]`);
  const currentCat = card.closest(".category-section").dataset.category;

  const modal = document.querySelector("#transfer-modal");
  const input = document.querySelector("#transfer-category-input");
  const datalist = document.querySelector("#existing-categories");

  const categories = Array.from(
    document.querySelectorAll(".category-section"),
  ).map((s) => s.dataset.category);

  datalist.innerHTML = categories
    .map((cat) => `<option value="${cat}">`)
    .join("");

  input.value = "";
  input.placeholder = `Сейчас: ${currentCat}`;
  modal.style.display = "flex";
  input.focus();

  document.querySelector(".product-menu")?.remove();
};

window.closeTransferModal = () => {
  document.querySelector("#transfer-modal").style.display = "none";
  productToMove = null;
};

window.confirmTransfer = () => {
  const input = document.querySelector("#transfer-category-input");
  let newCat = input.value.trim();

  if (!newCat) return closeTransferModal();

  const sections = Array.from(document.querySelectorAll(".category-section"));
  const categoryNames = sections.map((s) => s.dataset.category);

  const exactMatch = categoryNames.find(
    (cat) => cat.toLowerCase() === newCat.toLowerCase(),
  );

  if (!exactMatch && !suggestion) {
    if (!confirm(`Категории "${newCat}" не существует. Создать новую?`)) return;
  }

  if (exactMatch) {
    newCat = exactMatch;
  } else {
    const suggestion = categoryNames.find((cat) =>
      cat.toLowerCase().includes(newCat.toLowerCase()),
    );

    if (suggestion) {
      if (
        !confirm(
          `Категория "${newCat}" не найдена. Возможно, вы имели в виду "${suggestion}"?`,
        )
      ) {
      } else {
        newCat = suggestion;
      }
    }
  }

  const card = document.querySelector(
    `.product-card[data-id="${productToMove}"]`,
  );
  const name = card.querySelector(".product-card__name").textContent;
  const priceText = card.querySelector(".product-card__price").textContent;
  const price = parseInt(priceText);
  const priceUnit = card
    .querySelector(".product-card__unit")
    .textContent.replace("/ ", "");

  deleteProduct(productToMove);
  renderProduct({
    id: productToMove,
    title: name,
    price: price,
    priceUnit: priceUnit,
    category: newCat,
  });

  closeTransferModal();
};

window.deleteCategory = (categoryName) => {
  if (
    !confirm(
      `Вы уверены? Это удалит категорию "${categoryName}" и ВСЕ товары внутри нее.`,
    )
  )
    return;

  const section = document.querySelector(
    `.category-section[data-category="${categoryName}"]`,
  );
  if (section) section.remove();

  if (document.querySelectorAll(".category-section").length === 0) {
    emptyState.style.display = "flex";
  }
  document.querySelector(".product-menu")?.remove();
};

window.editCategoryName = (oldName) => {
  const newName = prompt("Новое название категории:", oldName);
  if (!newName || newName === oldName) return;

  const section = document.querySelector(
    `.category-section[data-category="${oldName}"]`,
  );
  if (section) {
    section.dataset.category = newName;
    section.querySelector(".category-section__title").textContent = newName;
    const menuBtn = section.querySelector(".category-section__menu-btn");
    menuBtn.setAttribute("onclick", `openCategoryMenu(event, '${newName}')`);
  }
  document.querySelector(".product-menu")?.remove();
};

window.moveCategory = (categoryName, direction) => {
  const section = document.querySelector(
    `.category-section[data-category="${categoryName}"]`,
  );
  if (direction === "up" && section.previousElementSibling) {
    section.parentNode.insertBefore(section, section.previousElementSibling);
  } else if (direction === "down" && section.nextElementSibling) {
    section.parentNode.insertBefore(section.nextElementSibling, section);
  }
  document.querySelector(".product-menu")?.remove();
};

window.openCategoryMenu = (e, categoryName) => {
  e.stopPropagation();
  const existingMenu = document.querySelector(".product-menu");
  if (existingMenu && existingMenu.dataset.for === categoryName) {
    existingMenu.remove();
    return;
  }
  if (existingMenu) existingMenu.remove();

  const menuHtml = `
    <div class="product-menu is-active" data-for="${categoryName}">
      <div class="product-menu__item" onclick="addProductToCategory('${categoryName}')">➕ Добавить товар сюда</div>
      <div class="product-menu__item" onclick="editCategoryName('${categoryName}')">✎ Переименовать</div>
      <div class="product-menu__item" onclick="moveCategory('${categoryName}', 'up')">↑ Выше</div>
      <div class="product-menu__item" onclick="moveCategory('${categoryName}', 'down')">↓ Ниже</div>
      <div class="product-menu__item product-menu__item--delete" onclick="deleteCategory('${categoryName}')">🗑 Удалить всё</div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", menuHtml);
  const menu = document.querySelector(".product-menu");
  const rect = e.target.getBoundingClientRect();
  menu.style.position = "fixed";
  menu.style.top = `${rect.bottom + 5}px`;
  menu.style.left = `${rect.left - 120}px`;
};

window.addProductToCategory = (categoryName) => {
  openForm();

  selectField.classList.remove("is-hidden");
  selectField.disabled = false;
  inputField.classList.add("is-hidden");
  inputField.disabled = true;
  inputField.style.display = "none";

  selectField.value = categoryName;
  if (selectField.value !== categoryName) {
    const newOpt = new Option(categoryName, categoryName);
    selectField.add(newOpt);
    selectField.value = categoryName;
  }

  selectField.disabled = true;
  toggleBtn.style.display = "none";

  document.querySelector(".product-menu")?.remove();
};
