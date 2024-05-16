<script setup>
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

// Fetch filters
const { getFilter, setFilter, isFiltersActive } = await useFiltering();

// Fetch categories and process them on mount
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
                  slug
                  parent {
                    node {
                      id
                      name
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
                          }
                        }
                      }
                    }
                  }
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
    selectedTerms.value = getFilter('category') || [];
    console.log('Processed categories for rendering:', categories.value);
    console.log('Initial selected terms:', selectedTerms.value);
  } catch (error) {
    console.error('Error fetching product categories:', error);
  }
});

// Process categories
function processCategories(edges) {
  const categoriesMap = new Map();

  edges.forEach(edge => {
    const parentCategory = edge.node;

    if (!parentCategory.parent) {
      if (!categoriesMap.has(parentCategory.id)) {
        categoriesMap.set(parentCategory.id, { ...parentCategory, children: [], showChildren: false });
      }

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

  return Array.from(categoriesMap.values()).filter(category => !category.parent);
}

// Watch filters for changes
watch(isFiltersActive, () => {
  if (!isFiltersActive.value) selectedTerms.value = [];
  console.log('Updated selected terms after isFiltersActive change:', selectedTerms.value);
});

// Handle checkbox change
const checkboxChanged = (childSlug) => {
  if (selectedTerms.value.includes(childSlug)) {
    selectedTerms.value = selectedTerms.value.filter(slug => slug !== childSlug);
  } else {
    selectedTerms.value.push(childSlug);
  }
  setFilter('category', selectedTerms.value);
  console.log('Updated selected terms after checkbox change:', selectedTerms.value);
};

// Toggle category visibility
const toggleVisibility = (category) => {
  category.showChildren = !category.showChildren;
  console.log(`Toggled visibility for category: ${category.name}, showChildren: ${category.showChildren}`);
};

// Select parent category
const parentCategorySelected = (category) => {
  selectedTerms.value = [category.slug];
  setFilter('category', selectedTerms.value);
  category.showChildren = !category.showChildren; // Automatically toggle visibility of children
  console.log('Parent category selected:', category.name);
};
</script>

<template>
  <div v-if="categories.length">
    <div class="cursor-pointer flex font-semibold mt-8 justify-between items-center" @click="isOpen = !isOpen">
      <span>{{ label || $t('messages.shop.category', 2) }}</span>
      <Icon name="ion:chevron-down-outline" class="transform" :class="isOpen ? 'rotate-180' : ''" />
    </div>
    <div v-show="isOpen" class="mt-3">
      <div v-for="category in categories" :key="category.id" class="category-block">
        <div @click="parentCategorySelected(category)" class="parent-category">
          {{ category.name }}
          <Icon name="ion:chevron-forward-outline" :class="category.showChildren ? 'rotate-90' : ''" />
        </div>
        <div v-show="category.showChildren" class="child-categories">
          <div v-for="child in category.children" :key="child.id">
            <input :id="child.slug" v-model="selectedTerms" type="checkbox" :value="child.slug" @change="checkboxChanged(child.slug)">
            <label :for="child.slug">{{ child.name }}
              <span v-if="showCount">({{ child.count || 0 }})</span>
            </label>
          </div>
        </div>
      </div>
    </div>
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
</style>
