import { DishItem } from '../types';
import { CategoryTreeNode, DishRankingItem } from '../types/filter';

// Subcategory classifier based on dishes
export function buildDishTree(dishes: DishItem[]): CategoryTreeNode[] {
  if (!dishes || dishes.length === 0) {
    return [];
  }

  const categoryMap: Record<string, { name: string; enName: string; subs: Record<string, DishItem[]> }> = {
    skewers: {
      name: '炭烤串串',
      enName: 'Charcoal Skewers',
      subs: {
        '网红牛肉烤串': [],
        '经典牛羊与肉类': [],
        '鲜嫩猪禽烧烤': [],
        '现烤海鲜与鱼生': [],
        '丸滑豆品与素菜': [],
        '锡纸烧烤与主食': []
      }
    },
    western: {
      name: '精致西餐',
      enName: 'Western Bistro',
      subs: {
        '原切牛排主菜': [],
        '汉堡意面简餐': [],
        '开胃佐餐小食': [],
        '法式流心甜品': []
      }
    },
    mains: {
      name: '黑曜石炙烤主食',
      enName: 'Obsidian Mains',
      subs: {
        '碳烤和牛与肉类': [],
        '手工意式主餐': [],
        '主厨精选饭食': []
      }
    },
    drinks: {
      name: '极夜特调与冷萃',
      enName: 'Void Beverages & Cold Brew',
      subs: {
        '冷萃浓缩咖啡': [],
        '鲜果微气泡特饮': []
      }
    },
    snacks: {
      name: '炭火慢焙小食',
      enName: 'Charcoal Roasted Snacks',
      subs: {
        '黑松露炸物与薯条': [],
        '炙烤风味佐餐': []
      }
    },
    desserts: {
      name: '极光熔岩甜品',
      enName: 'Aurora Desserts',
      subs: {
        '熔岩舒芙蕾与烘焙': []
      }
    }
  };

  dishes.forEach((dish) => {
    if (!dish) return;
    const catKey = dish.category in categoryMap ? dish.category : 'skewers';
    const cat = categoryMap[catKey] || categoryMap.skewers;

    if (dish.category === 'skewers') {
      if (dish.name.includes('牛肉') || dish.name.includes('和牛') || dish.subCategory?.includes('beef')) {
        cat.subs['网红牛肉烤串'].push(dish);
      } else if (dish.name.includes('羊') || dish.name.includes('筋') || dish.subCategory?.includes('meat')) {
        cat.subs['经典牛羊与肉类'].push(dish);
      } else if (dish.name.includes('鸡') || dish.name.includes('猪') || dish.name.includes('五花') || dish.name.includes('排骨') || dish.name.includes('骨') || dish.name.includes('掌中宝')) {
        cat.subs['鲜嫩猪禽烧烤'].push(dish);
      } else if (dish.name.includes('虾') || dish.name.includes('生蚝') || dish.name.includes('鱿鱼') || dish.name.includes('海鲜') || dish.name.includes('鱼') || dish.name.includes('鳗')) {
        cat.subs['现烤海鲜与鱼生'].push(dish);
      } else if (dish.name.includes('锡纸') || dish.name.includes('面筋') || dish.name.includes('脑花') || dish.name.includes('馒头')) {
        cat.subs['锡纸烧烤与主食'].push(dish);
      } else {
        cat.subs['丸滑豆品与素菜'].push(dish);
      }
    } else if (dish.category === 'western') {
      if (dish.name.includes('牛排') || dish.name.includes('拼盘') || dish.subCategory?.includes('steak')) {
        cat.subs['原切牛排主菜'].push(dish);
      } else if (dish.name.includes('汉堡') || dish.name.includes('意面') || dish.name.includes('玉棋') || dish.name.includes('饭') || dish.subCategory?.includes('pasta')) {
        cat.subs['汉堡意面简餐'].push(dish);
      } else if (dish.name.includes('甜品') || dish.name.includes('蛋糕') || dish.name.includes('舒芙蕾') || dish.subCategory?.includes('dessert')) {
        cat.subs['法式流心甜品'].push(dish);
      } else {
        cat.subs['开胃佐餐小食'].push(dish);
      }
    } else if (dish.category === 'mains') {
      if (dish.name.includes('汉堡') || dish.name.includes('五花') || dish.name.includes('牛排')) {
        cat.subs['碳烤和牛与肉类'].push(dish);
      } else if (dish.name.includes('玉棋') || dish.name.includes('意面')) {
        cat.subs['手工意式主餐'].push(dish);
      } else {
        cat.subs['主厨精选饭食'].push(dish);
      }
    } else if (dish.category === 'drinks') {
      if (dish.name.includes('咖啡') || dish.name.includes('冷萃')) {
        cat.subs['冷萃浓缩咖啡'].push(dish);
      } else {
        cat.subs['鲜果微气泡特饮'].push(dish);
      }
    } else if (dish.category === 'snacks') {
      if (dish.name.includes('薯') || dish.name.includes('炸')) {
        cat.subs['黑松露炸物与薯条'].push(dish);
      } else {
        cat.subs['炙烤风味佐餐'].push(dish);
      }
    } else {
      cat.subs['熔岩舒芙蕾与烘焙'].push(dish);
    }
  });

  return Object.entries(categoryMap)
    .map(([id, item]) => {
      const subcategories = Object.entries(item.subs)
        .filter(([_, list]) => list && list.length > 0)
        .map(([subName, list]) => ({
          id: `${id}-${subName}`,
          name: subName,
          dishes: list
        }));

      const totalCount = subcategories.reduce((acc, cur) => acc + cur.dishes.length, 0);

      return {
        id,
        name: item.name,
        enName: item.enName,
        count: totalCount,
        subcategories
      };
    })
    .filter((node) => node.count > 0);
}

// Generate Rankings
export function getDishRankings(dishes: DishItem[]): {
  hotRankings: DishRankingItem[];
  chefRankings: DishRankingItem[];
  praiseRankings: DishRankingItem[];
} {
  const safeDishes = Array.isArray(dishes) ? dishes.filter((d) => d && d.name) : [];

  if (safeDishes.length === 0) {
    return {
      hotRankings: [],
      chefRankings: [],
      praiseRankings: []
    };
  }

  const hotDishes = [...safeDishes]
    .sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0) || (b.price || 0) - (a.price || 0))
    .slice(0, 5);

  const hotRankings: DishRankingItem[] = hotDishes.map((dish, index) => ({
    id: `hot-${dish.id || index}`,
    dishId: dish.id || `dish-hot-${index}`,
    rank: index + 1,
    dish,
    hotScore: 9800 - index * 620,
    tag: index === 0 ? '热销 TOP 1' : index === 1 ? '人气飙升' : '回头客推荐'
  }));

  let chefDishes = safeDishes.filter((d) => d.isChefSpecial || d.badgeText?.includes('招牌') || (d.price && d.price > 30)).slice(0, 4);
  if (chefDishes.length === 0) {
    chefDishes = safeDishes.slice(0, 4);
  }
  const chefRankings: DishRankingItem[] = chefDishes.map((dish, index) => ({
    id: `chef-${dish.id || index}`,
    dishId: dish.id || `dish-chef-${index}`,
    rank: index + 1,
    dish,
    hotScore: 9600 - index * 450,
    tag: '主厨匠心'
  }));

  let praiseDishes = safeDishes.filter((d) => d.available && (d.discountTag || d.isPopular)).slice(0, 4);
  if (praiseDishes.length === 0) {
    praiseDishes = safeDishes.slice(0, 4);
  }
  const praiseRankings: DishRankingItem[] = praiseDishes.map((dish, index) => ({
    id: `praise-${dish.id || index}`,
    dishId: dish.id || `dish-praise-${index}`,
    rank: index + 1,
    dish,
    hotScore: 9900 - index * 310,
    tag: '好评如潮 99.8%'
  }));

  return { hotRankings, chefRankings, praiseRankings };
}

