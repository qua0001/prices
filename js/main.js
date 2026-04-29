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
const imageInput = document.querySelector("#product-image");
const lightbox = document.querySelector("#image-lightbox");
const lightboxImg = lightbox.querySelector(".lightbox__img");

let editingProductId = null;
let originalProductData = null;
let lockedCategory = null;

const formatString = (str) => {
  if (!str) return "";
  const trimmed = str.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const productsHistory = {};

window.addToHistory = (id, message) => {
  if (!productsHistory[id]) productsHistory[id] = [];
  const now = new Date().toLocaleString();
  productsHistory[id].unshift({ date: now, msg: message });
};

window.showHistory = (id) => {
  const content = document.querySelector("#history-content");
  const history = productsHistory[id] || [];

  if (history.length === 0) {
    content.innerHTML = "<p>Истории изменений пока нет</p>";
  } else {
    content.innerHTML = history
      .map(
        (item) => `
      <div class="history-item">
        <span>${item.date}</span>
        ${item.msg}
      </div>
    `,
      )
      .join("");
  }

  document.querySelector("#history-modal").style.display = "flex";
  document.querySelector(".product-menu")?.remove();
};

window.closeHistory = () => {
  document.querySelector("#history-modal").style.display = "none";
};

const openForm = () => {
  addForm.style.display = "flex";
  document.body.style.overflow = "hidden";

  document.querySelector(".add-form__title").textContent = "Новый товар";
  document.querySelector(".add-form__btn-submit").textContent = "Добавить";
  editingProductId = null;
  
  imageInput.value = "";
  const existingImagePreview = document.querySelector(".add-form__image-preview");
  if (existingImagePreview) existingImagePreview.remove();
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
  toggleBtn.style.display = "block";
  
  editingProductId = null;
  originalProductData = null;
  lockedCategory = null;
  
  imageInput.value = "";
  const existingImagePreview = document.querySelector(".add-form__image-preview");
  if (existingImagePreview) existingImagePreview.remove();
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

  const imageHtml = product.image
    ? `<div class="product-card__img"><img src="${product.image}" alt="${product.title}"></div>`
    : `<div class="product-card__img product-card__img--empty">📦</div>`;

  const productHtml = `
    <div class="product-card" data-id="${product.id}">
      ${imageHtml}
      <div class="product-card__info">
        <h3 class="product-card__name">${product.title}</h3>
        <div class="product-card__price">${product.price} ₽ <span class="product-card__unit">/ ${product.priceUnit}</span></div>
      </div>
      <button class="product-card__menu-btn" onclick="openProductMenu(event, '${product.id}')">⋮</button>
    </div>
  `;
  listContainer.insertAdjacentHTML("afterbegin", productHtml);
};

addFormElement.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(addFormElement);

  const rawTitle = formData.get("product-name");
  const rawPrice = formData.get("product-price");
  const isCustomActive = !inputField.classList.contains("is-hidden");
  const selectIsDisabled = selectField.disabled;

  const title = formatString(rawTitle);
  if (!title) return alert("Введите название");
  if (rawPrice.length > 6) return alert("Максимум 6 цифр в цене");

  let category;
  if (selectIsDisabled && lockedCategory) {
    category = lockedCategory;
  } else if (isCustomActive) {
    category = formatString(formData.get("custom-category"));
  } else {
    category = formatString(formData.get("product-category"));
  }
  
  if (!category || category === "Выберите категорию..." || category === "")
    category = "Без категории";

  const isDuplicate = Array.from(
    document.querySelectorAll(".product-card"),
  ).some((card) => {
    return (
      card.querySelector(".product-card__name").textContent.toLowerCase() ===
        title.toLowerCase() && card.dataset.id !== String(editingProductId)
    );
  });

  if (isDuplicate) return alert("Такой товар уже есть!");

  if (title.length > 40) return alert("Название не может быть длиннее 40 символов");
  if (!isCustomActive && category.length > 25) return alert("Категория не может быть длиннее 25 символов");

  let imageData = null;
  const file = imageInput.files[0];
  if (file) {
    imageData = await new Promise((r) => {
      const reader = new FileReader();
      reader.onload = () => r(reader.result);
      reader.readAsDataURL(file);
    });
  } else if (editingProductId) {
    imageData =
      document.querySelector(`.product-card[data-id="${editingProductId}"] img`)
        ?.src || null;
  }

  const productData = {
    title,
    price: parseInt(rawPrice),
    priceUnit: formData.get("price-unit"),
    category,
    image: imageData,
  };

  if (editingProductId) {
    const hasChanges = 
      originalProductData.name !== title ||
      originalProductData.price !== parseInt(rawPrice) ||
      originalProductData.category !== category ||
      originalProductData.unit !== formData.get("price-unit");
    
    if (hasChanges && !confirm("Вы уверены, что хотите изменить этот товар?")) return;
    
    removeProductCard(editingProductId);
    renderProduct({ id: editingProductId, ...productData });
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
        <div class="product-menu__item" onclick="editProduct('${productId}')">✎ Изменить</div>
        <div class="product-menu__item" onclick="moveProduct('${productId}')">⇄ Переместить</div>
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

window.removeProductCard = (id) => {
  const card = document.querySelector(`.product-card[data-id="${id}"]`);
  if (card) card.remove();

  if (
    document.querySelectorAll(".product-card").length === 0 &&
    document.querySelectorAll(".category-section").length === 0
  ) {
    emptyState.style.display = "flex";
  }
};

window.editProduct = (id) => {
  const card = document.querySelector(`.product-card[data-id="${id}"]`);
  const name = card.querySelector(".product-card__name").textContent;
  const price = parseInt(
    card.querySelector(".product-card__price").textContent,
  );
  const unit = card
    .querySelector(".product-card__unit")
    .textContent.replace("/ ", "")
    .trim();
  const category = card.closest(".category-section").dataset.category;
  const image = card.querySelector("img")?.src || null;

  const menu = document.querySelector(".product-menu");
  if (menu) menu.remove();

  editingProductId = id;
  originalProductData = { name, price, category, unit };

  addForm.style.display = "flex";
  document.body.style.overflow = "hidden";

  document.querySelector("#product-name").value = name;
  document.querySelector("#product-price").value = price;

  selectField.value = category;
  inputField.classList.add("is-hidden");
  inputField.style.display = "none";
  inputField.disabled = true;
  toggleBtn.textContent = "+ Добавить новую категорию";
  toggleBtn.style.display = "block";

  document.querySelectorAll('input[name="price-unit"]').forEach((radio) => {
    radio.checked = radio.value === unit;
  });

  imageInput.value = "";
  const existingImagePreview = document.querySelector(".add-form__image-preview");
  if (existingImagePreview) existingImagePreview.remove();
  
  if (image) {
    const preview = document.createElement("div");
    preview.className = "add-form__image-preview";
    preview.style.cssText = "margin-top: 10px; position: relative; width: 60px; height: 60px; border-radius: 5px; overflow: hidden;";
    preview.innerHTML = `
      <img src="${image}" style="width: 100%; height: 100%; object-fit: cover;">
      <button type="button" style="position: absolute; top: 0; right: 0; background: red; color: white; border: none; padding: 2px 5px; cursor: pointer; border-radius: 0 5px 0 0;" onclick="event.preventDefault(); this.closest('.add-form__image-preview').remove(); document.querySelector('#product-image').value = '';">✕</button>
    `;
    imageInput.parentElement.insertBefore(preview, imageInput.nextElementSibling);
  }

  document.querySelector(".add-form__title").textContent = "Редактирование";
  document.querySelector(".add-form__btn-submit").textContent = "Сохранить";
};

window.moveProduct = (id) => {
  const card = document.querySelector(`.product-card[data-id="${id}"]`);
  const currentCat = card.closest(".category-section").dataset.category;

  let newCat = prompt("Введите новую категорию:", currentCat);

  if (!newCat) return;
  
  newCat = formatString(newCat);

  if (newCat.length > 25) {
    alert("Название категории слишком длинное!");
    return;
  }

  const sections = Array.from(document.querySelectorAll(".category-section"));
  const categoryNames = sections.map((s) => s.dataset.category);
  const categoryExists = categoryNames.some((cat) => cat.toLowerCase() === newCat.toLowerCase());

  if (newCat === currentCat) return;

  if (!categoryExists) {
    if (!confirm(`Категория "${newCat}" не существует. Хотите её создать?`)) return;
  } else {
    if (!confirm(`Вы уверены, что хотите переместить товар в категорию "${newCat}"?`)) return;
  }

  const name = card.querySelector(".product-card__name").textContent;
  const priceText = card.querySelector(".product-card__price").textContent;
  const price = parseInt(priceText);
  const priceUnit = card
    .querySelector(".product-card__unit")
    .textContent.replace("/ ", "")
    .trim();
  const image = card.querySelector("img")?.src || null;

  removeProductCard(id);
  renderProduct({
    id: id,
    title: name,
    price: price,
    priceUnit: priceUnit,
    category: newCat,
    image: image,
  });
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

  if (!exactMatch) {
    const suggestion = categoryNames.find((cat) =>
      cat.toLowerCase().includes(newCat.toLowerCase()),
    );

    if (suggestion) {
      if (
        confirm(
          `Категории "${newCat}" не существует. Использовать похожу disguised как "${suggestion}"?`,
        )
      ) {
        newCat = suggestion;
      } else {
        if (!confirm(`Создать новую категорию "${newCat}"?`)) return;
      }
    } else {
      if (!confirm(`Категории "${newCat}" не существует. Создать новую?`))
        return;
    }
  } else {
    newCat = exactMatch;
  }

  if (
    !confirm(
      `Вы уверены, что хотите переместить товар в категорию "${newCat}"?`,
    )
  )
    return;

  const card = document.querySelector(
    `.product-card[data-id="${productToMove}"]`,
  );
  const name = card.querySelector(".product-card__name").textContent;
  const priceText = card.querySelector(".product-card__price").textContent;
  const price = parseInt(priceText);
  const priceUnit = card
    .querySelector(".product-card__unit")
    .textContent.replace("/ ", "");

  deleteProductForMove(productToMove);

  renderProduct({
    id: productToMove,
    title: name,
    price: price,
    priceUnit: priceUnit,
    category: newCat,
  });

  if (window.addToHistory) {
    addToHistory(productToMove, `Товар перемещен в категорию: ${newCat}`);
  }

  closeTransferModal();
};

window.deleteProductForMove = (id) => {
  const card = document.querySelector(`.product-card[data-id="${id}"]`);
  if (card) card.remove();
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
  let newName = prompt("Новое название категории:", oldName);
  if (!newName) return;
  
  newName = formatString(newName);
  
  if (newName === oldName) {
    alert("Название категории не изменилось!");
    return;
  }
  
  if (newName.length > 25) {
    alert("Название категории не может быть длиннее 25 символов!");
    return;
  }
  
  if (!confirm(`Вы уверены, что хотите переименовать "${oldName}" в "${newName}"?`)) return;

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
      <div class="product-menu__item" onclick="addProductToCategory('${categoryName}')">➕ Добавить товар</div>
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

  inputField.classList.add("is-hidden");
  inputField.style.display = "none";
  inputField.disabled = true;
  selectField.classList.remove("is-hidden");
  selectField.value = categoryName;
  selectField.disabled = true;
  toggleBtn.style.display = "none";
  
  lockedCategory = categoryName;

  document.querySelector(".product-menu")?.remove();
};

document.addEventListener("click", (e) => {
  const productImg = e.target.closest(".product-card__img img");
  if (productImg) {
    lightboxImg.src = productImg.src;
    lightbox.classList.add("is-active");
  }
});

lightbox.addEventListener("click", () => {
  lightbox.classList.remove("is-active");
});
