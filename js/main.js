const supabaseUrl = "https://nmenoermkncathrgucds.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZW5vZXJta25jYXRocmd1Y2RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzY0MjksImV4cCI6MjA5MzA1MjQyOX0.QB0dn_-HR6tmzvOLbENQfc2l5K1JG7wXttJoW3PHT5I";

let supabaseClient = null;

// Переменные для элементов DOM (инициализируются при DOMContentLoaded)
let createBtn;
let addForm;
let cancelBtn;
let overlay;
let toggleBtn;
let inputField;
let selectField;
let addFormElement;
let productList;
let emptyState;
let formContent;
let imageInput;
let lightbox;
let lightboxImg;

let productsBroadcast = null;
let syncIntervalId = null;

const initSupabase = () => {
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    console.log("✅ Supabase инициализирован");
    
    // Удаляем служебные записи из базы (если они остались)
    cleanupSystemRecords();
    
    fetchProducts(); // Загружаем товары и извлекаем категории из них
    
    // Настраиваем Realtime подписку для синхронизации между устройствами
    setupRealtimeSync();
    
    // Настраиваем BroadcastChannel для синхронизации между вкладками
    setupBroadcastChannel();
    
    // Добавляем polling для надежной синхронизации между origin'ами
    setupPollingSync();
  } else {
    console.error("❌ Supabase библиотека не загружена");
  }
};

// Удаляем служебные записи из базы
const cleanupSystemRecords = async () => {
  if (!supabaseClient) return;
  
  try {
    await supabaseClient
      .from("products")
      .delete()
      .or("title.eq._CATEGORIES_META,category.eq._SYSTEM");
    
    console.log('🧹 Служебные записи удалены');
  } catch (error) {
    console.error('❌ Ошибка при удалении служебных записей:', error);
  }
};

// Realtime подписка для получения обновлений товаров
const setupRealtimeSync = () => {
  if (!supabaseClient) return;
  
  try {
    supabaseClient
      .channel('products-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          console.log('📡 Realtime изменение получено:', payload.eventType);
          
          // Перезагружаем товары для синхронизации
          fetchProducts();
        }
      )
      .subscribe((status) => {
        console.log('🔌 Realtime статус:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime подписка активна');
        }
      });
  } catch (error) {
    console.error('❌ Ошибка Realtime подписки:', error);
  }
};

// Polling для надежной синхронизации между разными origin'ами (Live Server vs GitHub Pages)
const setupPollingSync = () => {
  // Проверяем данные каждые 5 секунд
  syncIntervalId = setInterval(async () => {
    if (!supabaseClient) return;
    
    try {
      const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Получаем текущее количество товаров на странице
      const currentCount = document.querySelectorAll(".product-card").length;
      const newCount = data ? data.length : 0;
      
      // Если количество товаров изменилось, перезагружаем данные
      if (currentCount !== newCount) {
        console.log(`🔄 Polling: товаров было ${currentCount}, теперь ${newCount}. Обновляем...`);
        fetchProducts();
      }
    } catch (error) {
      console.error('❌ Ошибка polling синхронизации:', error);
    }
  }, 5000); // 5 секунд
};

// BroadcastChannel для синхронизации пустых категорий между вкладками
const setupBroadcastChannel = () => {
  if (!window.BroadcastChannel) {
    console.warn('⚠️ BroadcastChannel не поддерживается');
    return;
  }
  
  try {
    productsBroadcast = new BroadcastChannel('products-sync');
    
    productsBroadcast.onmessage = (event) => {
      console.log('📢 Сообщение от другой вкладки:', event.data);
      
      if (event.data.type === 'categories-updated') {
        // Синхронизируем пустые категории
        const { categories } = event.data;
        categories.forEach((categoryName) => {
          const existing = document.querySelector(
            `.category-section[data-category="${categoryName}"]`,
          );
          if (!existing) {
            ensureCategoryExists(categoryName);
          }
        });
      } else if (event.data.type === 'category-deleted') {
        // Удаляем категорию на других вкладках
        const { categoryName } = event.data;
        const section = document.querySelector(
          `.category-section[data-category="${categoryName}"]`,
        );
        if (section) {
          section.remove();
          console.log(`🗑️ Категория "${categoryName}" удалена на этой вкладке`);
        }
        
        // Обновляем select и пустое состояние
        if (document.querySelectorAll(".category-section").length === 0) {
          emptyState.style.display = "flex";
        }
        updateSelectOptions();
      } else if (event.data.type === 'products-updated') {
        // Полное обновление товаров
        location.reload();
      }
    };
  } catch (error) {
    console.warn('⚠️ Не удалось создать BroadcastChannel:', error);
  }
};

const initializeDOMElements = () => {
  createBtn = document.querySelector(".create-button");
  addForm = document.querySelector(".add-form");
  cancelBtn = document.querySelector(".add-form__btn-cancel");
  overlay = document.querySelector(".add-form__overlay");
  toggleBtn = document.querySelector(".add-form__toggle-btn");
  inputField = document.querySelector("#add-category");
  selectField = document.querySelector("#product-category");
  addFormElement = document.querySelector(".add-form form");
  productList = document.querySelector(".product-list");
  emptyState = document.querySelector(".empty-state");
  formContent = document.querySelector(".add-form__content");
  imageInput = document.querySelector("#product-image");
  lightbox = document.querySelector("#image-lightbox");
  lightboxImg = lightbox.querySelector(".lightbox__img");
};

let editingProductId = null;
let originalProductData = null;
let lockedCategory = null;
let productToMove = null;
let isSubmitting = false; // Флаг для предотвращения двойной отправки

const formatString = (str) => {
  if (!str) return "";
  const trimmed = str.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

// Функция для сортировки категорий в алфавитном порядке
const sortCategories = () => {
  const sections = Array.from(document.querySelectorAll(".category-section"));
  const sortedSections = sections.sort((a, b) =>
    a.dataset.category.localeCompare(b.dataset.category, "ru"),
  );

  sortedSections.forEach((section) => {
    productList.appendChild(section);
  });
};

// Функция для сортировки товаров в категории в алфавитном порядке
const sortProductsInCategory = (categoryName) => {
  const categorySection = document.querySelector(
    `.category-section[data-category="${categoryName}"]`,
  );
  if (!categorySection) return;

  const listContainer = categorySection.querySelector(
    ".category-section__list",
  );
  const products = Array.from(listContainer.querySelectorAll(".product-card"));

  const sortedProducts = products.sort((a, b) => {
    const nameA = a.querySelector(".product-card__name").textContent;
    const nameB = b.querySelector(".product-card__name").textContent;
    return nameA.localeCompare(nameB, "ru");
  });

  sortedProducts.forEach((product) => {
    listContainer.appendChild(product);
  });
};

// Сохраняем категории в localStorage и синхронизируем между вкладками
const saveCategoriesLocally = () => {
  const categories = Array.from(
    document.querySelectorAll(".category-section"),
  ).map((section) => section.dataset.category);
  localStorage.setItem("categories", JSON.stringify(categories));
  
  // Уведомляем другие вкладки о изменении категорий
  if (productsBroadcast) {
    productsBroadcast.postMessage({
      type: 'categories-updated',
      categories: categories
    });
  }
};

// Загружаем категории из localStorage
const loadCategoriesLocally = () => {
  const stored = localStorage.getItem("categories");
  return stored ? JSON.parse(stored) : [];
};

// Функция для обновления опций select на основе существующих категорий
const updateSelectOptions = () => {
  const existingCategories = Array.from(
    document.querySelectorAll(".category-section"),
  )
    .map((section) => section.dataset.category)
    .sort((a, b) => a.localeCompare(b, "ru"));

  // Очищаем select кроме первой опции (placeholder)
  const placeholder = selectField.options[0];
  while (selectField.options.length > 1) {
    selectField.remove(1);
  }

  // Добавляем только существующие категории
  existingCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    selectField.appendChild(option);
  });

  // Сохраняем категории в localStorage
  saveCategoriesLocally();
};

// Загружаем товары и извлекаем категории из них
async function fetchProducts() {
  if (!supabaseClient) {
    console.error("❌ Supabase не инициализирован");
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Загружаем сохраненные категории из localStorage
    const savedCategories = loadCategoriesLocally();
    
    // Очищаем только товары, но оставляем заголовки категорий
    document.querySelectorAll(".product-card").forEach((card) => {
      card.remove();
    });

    // Фильтруем служебные записи (метаданные)
    const products = data ? data.filter(p => p.title !== "_CATEGORIES_META" && p.category !== "_SYSTEM") : [];

    if (products && products.length > 0) {
      emptyState.style.display = "none";
      products.forEach((product) => {
        renderProduct({
          id: product.id,
          title: product.title,
          price: product.price,
          priceUnit: product.price_unit || "шт",
          category: product.category,
          image: product.image,
        });
      });
      console.log(`✅ Загружено ${products.length} товаров`);

      // Обновляем опции select на основе загруженных категорий
      updateSelectOptions();
    } else {
      console.log("ℹ️ Товаров в базе не найдено");
      emptyState.style.display = "flex";
    }

    // Восстанавливаем пустые категории из localStorage
    savedCategories.forEach((categoryName) => {
      const existing = document.querySelector(
        `.category-section[data-category="${categoryName}"]`,
      );
      if (!existing) {
        ensureCategoryExists(categoryName);
      }
    });

    // Обновляем select еще раз со всеми категориями
    updateSelectOptions();
  } catch (error) {
    console.error("❌ Ошибка загрузки данных:", error.message);
  }
}

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

window.openForm = () => {
  // Если DOM элементы еще не инициализированы, инициализируем
  if (!addForm) {
    initializeDOMElements();
  }
  
  addForm.style.display = "flex";
  document.body.style.overflow = "hidden";

  document.querySelector(".add-form__title").textContent = "Новый товар";
  document.querySelector(".add-form__btn-submit").textContent = "Добавить";
  editingProductId = null;

  imageInput.value = "";
  const existingImagePreview = document.querySelector(
    ".add-form__image-preview",
  );
  if (existingImagePreview) existingImagePreview.remove();
};

window.closeForm = () => {
  // Если DOM элементы еще не инициализированы, инициализируем
  if (!addForm) {
    initializeDOMElements();
  }
  
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
  const existingImagePreview = document.querySelector(
    ".add-form__image-preview",
  );
  if (existingImagePreview) existingImagePreview.remove();
};

// Создает UI секцию категории (без сохранения в БД - это делается отдельно)
const ensureCategoryExists = (categoryName) => {
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

    // Обновляем опции select
    updateSelectOptions();

    // Сортируем категории
    sortCategories();
  }
  return categorySection;
};

// Это для обратной совместимости - используется при добавлении товара
window.ensureCategory = (categoryName) => {
  return ensureCategoryExists(categoryName);
};

const renderProduct = (product) => {
  // Пропускаем служебные записи
  if (product.category === "_SYSTEM" || product.title === "_CATEGORIES_META") {
    console.log('🚫 Пропускаем служебную запись:', product);
    return;
  }

  // Гарантируем, что priceUnit всегда имеет значение
  const priceUnit = product.priceUnit || "шт";

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
        <div class="product-card__price">${product.price} ₽ <span class="product-card__unit">/ ${priceUnit}</span></div>
      </div>
      <button class="product-card__menu-btn" onclick="openProductMenu(event, '${product.id}')">⋮</button>
    </div>
  `;
  listContainer.insertAdjacentHTML("afterbegin", productHtml);

  // Сортируем товары в категории
  sortProductsInCategory(product.category);
};

const attachFormSubmitListener = () => {
  if (!addFormElement) return;

  addFormElement.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    // Предотвращаем двойную отправку
    if (isSubmitting) return;
    isSubmitting = true;
    
    try {
      const formData = new FormData(addFormElement);

      const rawTitle = formData.get("product-name");
      const rawPrice = formData.get("product-price");
      const isCustomActive = !inputField.classList.contains("is-hidden");
      const selectIsDisabled = selectField.disabled;
      const priceUnitValue = formData.get("price-unit") || "шт";

      const title = formatString(rawTitle);
      if (!title) {
        alert("Введите название");
        return;
      }
      if (rawPrice.length > 6) {
        alert("Максимум 6 цифр в цене");
        return;
      }

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

      // Улучшенная проверка дубликатов - используем dataset.id для сравнения
      const isDuplicate = Array.from(
        document.querySelectorAll(".product-card"),
      ).some((card) => {
        const cardId = card.dataset.id;
        const isSameProduct = cardId === String(editingProductId);
        const cardName = card
          .querySelector(".product-card__name")
          .textContent.toLowerCase();

        return cardName === title.toLowerCase() && !isSameProduct;
      });

      if (isDuplicate) {
        alert("Такой товар уже есть!");
        return;
      }

      if (title.length > 40) {
        alert("Название не может быть длиннее 40 символов");
        return;
      }
      if (category.length > 25) {
        alert("Категория не может быть длиннее 25 символов");
        return;
      }

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
          document.querySelector(
            `.product-card[data-id="${editingProductId}"] img`,
          )?.src || null;
      }

      const productData = {
        title,
        price: parseInt(rawPrice),
        priceUnit: priceUnitValue,
        category,
        image: imageData,
      };

      if (editingProductId) {
        const hasChanges =
          originalProductData.name !== title ||
          originalProductData.price !== parseInt(rawPrice) ||
          originalProductData.category !== category ||
          originalProductData.unit !== priceUnitValue;

        // Если меняется только категория - показываем специальное подтверждение как при перемещении
        if (originalProductData.category !== category && hasChanges) {
          if (
            !confirm(
              `Вы уверены, что хотите переместить товар в категорию "${category}"?`,
            )
          )
            return;
        } else if (
          hasChanges &&
          !confirm("Вы уверены, что хотите изменить этот товар?")
        ) {
          return;
        }

        if (supabaseClient) {
          const { error } = await supabaseClient
            .from("products")
            .update({
              title: productData.title,
              price: productData.price,
              price_unit: productData.priceUnit,
              category: productData.category,
              image: productData.image,
            })
            .eq("id", editingProductId);

          if (error) {
            console.error("Ошибка Supabase:", error);
            throw new Error("Ошибка при обновлении в облако: " + error.message);
          }
        }

        // Если категория изменилась - перемещаем товар
        if (originalProductData.category !== category) {
          removeProductCard(editingProductId);
          renderProduct({ id: editingProductId, ...productData });
        } else {
          // При редактировании - обновляем без удаления и переиндекса
          const card = document.querySelector(
            `.product-card[data-id="${editingProductId}"]`,
          );
          if (card) {
            // Обновляем содержимое карточки
            card.querySelector(".product-card__name").textContent =
              productData.title;
            card.querySelector(".product-card__price").innerHTML =
              `${productData.price} ₽ <span class="product-card__unit">/ ${productData.priceUnit}</span>`;

            // ИСПРАВЛЕНИЕ: Получаем ссылку на текущую картинку прямо из верстки карточки
            const currentImage = card.querySelector("img")?.src || null;

            // Сравниваем с currentImage вместо несуществующей переменной
            if (productData.image !== currentImage) {
              const imageContainer = card.querySelector(".product-card__img");
              if (productData.image) {
                imageContainer.innerHTML = `<img src="${productData.image}" alt="${productData.title}">`;
                imageContainer.classList.remove("product-card__img--empty");
              } else {
                imageContainer.textContent = "📦";
                imageContainer.classList.add("product-card__img--empty");
              }
            }

            // Переостраиваем сортировку в категории
            sortProductsInCategory(category);
          }
        }
      } else {
        if (supabaseClient) {
          const { data, error } = await supabaseClient
            .from("products")
            .insert([
              {
                title: productData.title,
                price: productData.price,
                price_unit: productData.priceUnit,
                category: productData.category,
                image: productData.image,
              },
            ])
            .select();

          if (error) {
            console.error("Ошибка Supabase:", error);
            throw new Error("Ошибка при сохранении в облако: " + error.message);
          }

          renderProduct(data[0]);
        } else {
          renderProduct({ id: Date.now(), ...productData });
        }
      }

    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      alert(error.message || 'Произошла ошибка при сохранении товара');
    } finally {
      isSubmitting = false;
      closeForm();
    }
  });
};

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

window.deleteProduct = async (id) => {
  if (!confirm("Удалить этот товар?")) return;

  if (supabaseClient) {
    const { error } = await supabaseClient
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Ошибка Supabase:", error);
      return alert("Не удалось удалить из облака: " + error.message);
    }
  }

  const card = document.querySelector(`.product-card[data-id="${id}"]`);
  if (card) {
    const categoryName = card.closest(".category-section")?.dataset.category;
    card.remove();

    // Если категория стала пустой, она остаётся видимой для синхронизации между устройствами
    if (categoryName) {
      const categorySection = document.querySelector(
        `.category-section[data-category="${categoryName}"]`,
      );
      if (categorySection) {
        const productsInCategory =
          categorySection.querySelectorAll(".product-card").length || 0;

        // Сохраняем пустую категорию локально
        saveCategoriesLocally();
      }
    }
  }

  // Если НЕТ товаров ВОО вообще - показываем пустое состояние
  if (document.querySelectorAll(".product-card").length === 0) {
    emptyState.style.display = "flex";
  }

  document.querySelector(".product-menu")?.remove();
  updateSelectOptions();
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
  const priceText = card.querySelector(".product-card__price").textContent;
  const price = parseInt(priceText);
  const unitText = card.querySelector(".product-card__unit").textContent;
  const unit = unitText.replace("/ ", "").trim() || "шт";

  // Получаем категорию напрямую из DOM структуры (работает для всех товаров, включая перемещенные)
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

  // Обновляем select опции и выбираем правильную категорию
  updateSelectOptions();
  selectField.value = category;

  inputField.classList.add("is-hidden");
  inputField.style.display = "none";
  inputField.disabled = true;
  toggleBtn.textContent = "+ Добавить новую категорию";
  toggleBtn.style.display = "block";

  // Устанавливаем правильное значение price-unit
  document.querySelectorAll('input[name="price-unit"]').forEach((radio) => {
    radio.checked = radio.value === unit;
  });

  imageInput.value = "";
  const existingImagePreview = document.querySelector(
    ".add-form__image-preview",
  );
  if (existingImagePreview) existingImagePreview.remove();

  if (image) {
    const preview = document.createElement("div");
    preview.className = "add-form__image-preview";
    preview.style.cssText =
      "margin-top: 10px; position: relative; width: 60px; height: 60px; border-radius: 5px; overflow: hidden;";
    preview.innerHTML = `
      <img src="${image}" style="width: 100%; height: 100%; object-fit: cover;">
      <button type="button" style="position: absolute; top: 0; right: 0; background: red; color: white; border: none; padding: 2px 5px; cursor: pointer; border-radius: 0 5px 0 0;" onclick="event.preventDefault(); this.closest('.add-form__image-preview').remove(); document.querySelector('#product-image').value = '';">✕</button>
    `;
    imageInput.parentElement.insertBefore(
      preview,
      imageInput.nextElementSibling,
    );
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
  const categoryExists = categoryNames.some(
    (cat) => cat.toLowerCase() === newCat.toLowerCase(),
  );

  if (newCat === currentCat) return;

  if (!categoryExists) {
    if (!confirm(`Категория "${newCat}" не существует. Хотите её создать?`))
      return;
  } else {
    if (
      !confirm(
        `Вы уверены, что хотите переместить товар в категорию "${newCat}"?`,
      )
    )
      return;
  }

  const name = card.querySelector(".product-card__name").textContent;
  const priceText = card.querySelector(".product-card__price").textContent;
  const price = parseInt(priceText);
  const unitText = card.querySelector(".product-card__unit").textContent;
  const priceUnit = unitText.replace("/ ", "").trim() || "шт";
  const image = card.querySelector("img")?.src || null;

  // Синхронизируем изменение категории с Supabase
  if (supabaseClient) {
    supabaseClient
      .from("products")
      .update({ category: newCat })
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Ошибка при обновлении категории:", error);
      });
  }

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
          `Категории "${newCat}" не существует. Использовать похожую как "${suggestion}"?`,
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
  const unitText = card.querySelector(".product-card__unit").textContent;
  const priceUnit = unitText.replace("/ ", "").trim() || "шт";
  const image = card.querySelector("img")?.src || null;

  deleteProductForMove(productToMove);

  renderProduct({
    id: productToMove,
    title: name,
    price: price,
    priceUnit: priceUnit,
    category: newCat,
    image: image,
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

  // Удаляем товары в БД
  if (supabaseClient) {
    supabaseClient
      .from("products")
      .delete()
      .eq("category", categoryName)
      .then(({ error }) => {
        if (error) console.error("Ошибка при удалении товаров:", error);
      });
  }

  if (document.querySelectorAll(".category-section").length === 0) {
    emptyState.style.display = "flex";
  }

  // Обновляем select и сохраняем изменения
  updateSelectOptions();
  
  // Синхронизируем удаление категории с другими вкладками
  if (productsBroadcast) {
    productsBroadcast.postMessage({
      type: 'category-deleted',
      categoryName: categoryName
    });
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

  if (
    !confirm(
      `Вы уверены, что хотите переименовать "${oldName}" в "${newName}"?`,
    )
  )
    return;

  const section = document.querySelector(
    `.category-section[data-category="${oldName}"]`,
  );
  if (section) {
    section.dataset.category = newName;
    section.querySelector(".category-section__title").textContent = newName;
    const menuBtn = section.querySelector(".category-section__menu-btn");
    menuBtn.setAttribute("onclick", `openCategoryMenu(event, '${newName}')`);
  }

  // Обновляем товары в БД с новой категорией
  if (supabaseClient) {
    supabaseClient
      .from("products")
      .update({ category: newName })
      .eq("category", oldName)
      .then(({ error }) => {
        if (error) console.error("Ошибка при обновлении товаров:", error);
      });
  }

  // Обновляем select опции
  updateSelectOptions();

  // Пересортируем категории
  sortCategories();

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

const attachImageLightboxListener = () => {
  if (!lightbox) return;

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
};

// Инициализация при загрузке страницы
window.addEventListener("load", () => {
  console.log("📋 Страница загружена, инициализируем...");

  // Инициализируем элементы DOM
  initializeDOMElements();

  // Привязываем обработчики событий
  if (createBtn) createBtn.addEventListener("click", openForm);
  if (cancelBtn) cancelBtn.addEventListener("click", closeForm);
  if (overlay) overlay.addEventListener("click", closeForm);

  // Привязываем обработчик отправки формы
  attachFormSubmitListener();

  // Привязываем обработчик лайтбокса
  attachImageLightboxListener();

  if (toggleBtn) {
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
  }

  // Запрет на копирование
  document.body.style.userSelect = "none";
  document.body.style.webkitUserSelect = "none";
  document.body.style.MozUserSelect = "none";
  document.body.style.msUserSelect = "none";

  // Инициализируем Supabase
  initSupabase();
  
  // Обновляем данные при возращении на вкладку (фокусе)
  window.addEventListener('focus', () => {
    console.log('🔄 Страница получила фокус, обновляем данные...');
    fetchProducts();
  });
  
  // Обновляем данные при возврате видимости страницы
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('👁️ Страница стала видимой, включаем polling...');
      fetchProducts();
      
      // Убедимся что polling работает
      if (!syncIntervalId) {
        setupPollingSync();
      }
    } else {
      console.log('👁️ Страница скрыта, отключаем polling...');
      
      // Отключаем polling когда вкладка неактивна
      if (syncIntervalId) {
        clearInterval(syncIntervalId);
        syncIntervalId = null;
      }
    }
  });
});

// Дополнительный запрет на копирование через JavaScript
document.addEventListener("copy", (e) => {
  e.preventDefault();
  return false;
});
