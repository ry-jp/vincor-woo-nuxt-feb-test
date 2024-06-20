<script setup>
import { ref, watch, onMounted, inject } from 'vue';
import { useRoute } from 'vue-router';
import { useFiltering } from '@/composables/useFiltering';  // Ensure correct path to the composable

const { getFilter, setFilter, isFiltersActive } = useFiltering();

const props = defineProps({
  label: { type: String, default: '' },
  hideEmpty: { type: Boolean, default: false },
  showCount: { type: Boolean, default: false },
  open: { type: Boolean, default: true },
});

const route = useRoute();
const isOpen = ref(props.open);
const categories = ref([]);
const selectedTerms = ref([]);
const updateProductList = inject('updateProductList');  // Inject the updateProductList function

// Define the filterProductsByCategory function
const filterProductsByCategory = () => {
  console.log('Filtering products by categories:', selectedTerms.value);
  setFilter('category', selectedTerms.value);
  updateProductList();  // Ensure the product list is updated
};

// Load and process categories using $fetch
onMounted(async () => {
  try {
    const response = await $fetch('https://vincor.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query getProductCategories($first: Int = 100) {
            productCategories(first: $first, where: { orderby: COUNT, order: DESC, hideEmpty: true }) {
              edges {
                node {
                  id
                  name
                  parent {
                    node {
                      id
                      name
                      slug
                    }
                  }
                  children {
                    edges {
                      node {
                        id
                        name
                        slug
                        parent {
                          node {
                            id
                            name
                            slug
                          }
                        }
                      }
                    }
                  }
                  slug
                  image {
                    sourceUrl(size: MEDIUM_LARGE)
                    altText
                    title
                  }
                }
              }
            }
          }
        `,
        variables: { first: 100 },
      }),
    });

    categories.value = processCategories(response.data.productCategories.edges);
    console.log('Processed categories for rendering:', categories.value);

    // Load selected categories and visibility states from localStorage
    const storedSelectedTerms = localStorage.getItem('selectedCategories');
    if (storedSelectedTerms) {
      selectedTerms.value = JSON.parse(storedSelectedTerms);
    }
    console.log('Loaded selected terms from localStorage:', selectedTerms.value);

    const storedVisibilityStates = localStorage.getItem('categoryVisibilityStates');
    if (storedVisibilityStates) {
      const visibilityStates = JSON.parse(storedVisibilityStates);
      categories.value.forEach(category => {
        if (visibilityStates[category.id]) {
          category.showChildren = visibilityStates[category.id];
        }
      });
    }

    // Apply filters initially
    filterProductsByCategory();
  } catch (error) {
    console.error('Error fetching product categories:', error);
  }
});

function processCategories(edges) {
  const categoriesMap = new Map();

  edges.forEach(edge => {
    const parentCategory = edge.node;

    // Initialize parent node if not already in the map
    if (!parentCategory.parent) {
      if (!categoriesMap.has(parentCategory.id)) {
        categoriesMap.set(parentCategory.id, { ...parentCategory, children: [], showChildren: false });
      }

      // Process children and link them to the parent
      if (parentCategory.children && parentCategory.children.edges) {
        parentCategory.children.edges.forEach(childEdge => {
          const childNode = childEdge.node;
          if (!categoriesMap.has(childNode.id)) {
            categoriesMap.set(childNode.id, { ...childNode, children: [] });
          }
          categoriesMap.get(parentCategory.id).children.push(categoriesMap.get(childNode.id));
        });
      }
    }
  });

  // Extract only the top-level categories (those without a parent within the same list)
  return Array.from(categoriesMap.values()).filter(category => !category.parent);
}

// Save selected categories and visibility states to localStorage whenever they change
watch(selectedTerms, (newTerms) => {
  localStorage.setItem('selectedCategories', JSON.stringify(newTerms));
  console.log('Updated selected terms in watch:', selectedTerms.value);
  filterProductsByCategory();  // Ensure filtering is triggered
}, { deep: true });

watch(categories, (newCategories) => {
  const visibilityStates = newCategories.reduce((acc, category) => {
    acc[category.id] = category.showChildren;
    return acc;
  }, {});
  localStorage.setItem('categoryVisibilityStates', JSON.stringify(visibilityStates));
}, { deep: true });

const categorySlug = route.params.categorySlug;
if (categorySlug) selectedTerms.value = [categorySlug];

watch(route, (newRoute) => {
  const newCategorySlug = newRoute.params.categorySlug;
  if (newCategorySlug) {
    selectedTerms.value = [newCategorySlug];
    console.log('Route changed, new selected terms:', selectedTerms.value);
    filterProductsByCategory();  // Ensure filtering is triggered when route changes
  }
});

watch(isFiltersActive, () => {
  if (!isFiltersActive.value) selectedTerms.value = [];
});

const checkboxChanged = (childSlug) => {
  console.log('Checkbox changed:', childSlug);
  const index = selectedTerms.value.indexOf(childSlug);
  if (index > -1) {
    selectedTerms.value.splice(index, 1);
  } else {
    selectedTerms.value.push(childSlug);
  }
  console.log('Updated selected terms:', selectedTerms.value);
  filterProductsByCategory();  // Ensure filtering is triggered when checkbox changes
};

const toggleVisibility = (category) => {
  categories.value.forEach(cat => {
    if (cat.id !== category.id) {
      cat.showChildren = false;
    }
  });
  category.showChildren = !category.showChildren;
  console.log('Toggled visibility for category:', category.name, ', showChildren:', category.showChildren);
};

const parentCategorySelected = (category) => {
  selectedTerms.value = [category.slug];
  filterProductsByCategory();  // Ensure filtering is triggered when parent category is selected
  console.log('Parent category selected:', category.name);
};
</script>

<template>
  <div v-if="categories.length">
    <!-- Dropdown header for parent categories -->
    <div class="cursor-pointer flex font-semibold mt-8 justify-between items-center" @click="isOpen = !isOpen">
      <span>{{ label || $t('messages.shop.category', 2) }}</span>
      <Icon name="ion:chevron-down-outline" class="transform transition-transform duration-300" :class="isOpen ? 'rotate-180' : ''" />
    </div>
    <transition name="fade">
      <div v-show="isOpen" class="mt-3">
        <!-- Parent categories -->
        <div v-for="category in categories" :key="category.id" class="category-block">
          <div @click="() => { parentCategorySelected(category); toggleVisibility(category); }" class="parent-category">
            {{ category.name }}
            <Icon name="ion:chevron-forward-outline" class="transform transition-transform duration-300" :class="category.showChildren ? 'rotate-90' : ''" />
          </div>
          <!-- Child categories -->
          <transition name="fade">
            <div v-show="category.showChildren" class="child-categories">
              <div v-for="child in category.children" :key="child.id">
                <input  :id="child.slug" 
                  :checked="selectedTerms.includes(child.slug)" 
                  type="checkbox" 
                  :value="child.slug" 
                  @change="() => { checkboxChanged(child.slug) }">
                <label :for="child.slug">{{ child.name }}
                  <span v-if="showCount">({{ child.count || 0 }})</span>
                </label>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.category-block {
  margin-bottom: 5px;
}
.parent-category {
  cursor: pointer;
  padding: 10px;
  background-color: #f9f9f9;
  border: 1px solid #ddd;
}
.child-categories {
  padding-left: 20px;
  background-color: #f0f0f0;
}
.chevron {
  transition: transform 0.3s ease;
}
.rotate-90 {
  transform: rotate(90deg);
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
