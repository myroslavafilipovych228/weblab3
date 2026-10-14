import { Command } from 'commander';
import fs from 'node:fs';

const program = new Command();

program
  .name('character-cli')
  .description('CLI-програма для перегляду та аналізу даних персонажів гри')
  .version('1.0.0')
  .option('-f, --file <path>', 'шлях до JSON-файлу з даними', 'data.json');

function loadData() {
  const options = program.opts();
  const filePath = options.file;

  try {
    if (!fs.existsSync(filePath)) {
      console.error(`Помилка: Файл за шляхом "${filePath}" не знайдено.`);
      process.exit(1);
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('Помилка: Файл містить некоректний JSON-формат.');
    } else {
      console.error(`Помилка читання файлу: ${error.message}`);
    }
    process.exit(1);
  }
}

// Загальні можливості
program
  .command('list')
  .description('Показати стислий список персонажів')
  .option('-l, --limit <number>', 'обмежити кількість елементів', parseInt)
  .action((options) => {
    const data = loadData();
    let characters = data.characters || [];
    if (options.limit && !isNaN(options.limit)) {
      characters = characters.slice(0, options.limit);
    }
    console.log('--- Список персонажів ---');
    characters.forEach((char, index) => {
      console.log(`${index + 1}. ${char.name} (Здоров'я: ${char.health}, Клуб: ${char.club || 'немає'})`);
    });
  });

program
  .command('get')
  .description('Показати повні дані персонажа за його ім\'ям')
  .argument('<name>', 'ім\'я персонажа')
  .action((name) => {
    const data = loadData();
    const characters = data.characters || [];
    const found = characters.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (!found) {
      console.error(`Помилка: Персонажа з ім'ям "${name}" не знайдено.`);
      process.exit(1);
    }
    console.log(`--- Повна інформація про персонажа "${found.name}" ---`);
    console.log(JSON.stringify(found, null, 2));
  });

program
  .command('field')
  .description('Показати значення окремого або вкладеного поля за шляхом')
  .argument('<path>', 'шлях до поля через крапку (наприклад: characters.0.stats.stats_speed)')
  .action((path) => {
    const data = loadData();
    const keys = path.split('.');
    let current = data;
    for (const key of keys) {
      if (current === undefined || current === null || !(key in current)) {
        console.error(`Помилка: Поле "${path}" відсутнє у даних.`);
        process.exit(1);
      }
      current = current[key];
    }
    if (current === null) {
      console.log(`Значення поля "${path}": null`);
    } else if (typeof current === 'object') {
      console.log(`Значення поля "${path}":\n${JSON.stringify(current, null, 2)}`);
    } else {
      console.log(`Значення поля "${path}": ${current}`);
    }
  });

// Варіант 8: RPG-персонаж
program
  .command('stats')
  .description('Показати характеристики персонажа')
  .argument('<name>', 'ім\'я персонажа')
  .action((name) => {
    const data = loadData();
    const characters = data.characters || [];
    const char = characters.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (!char) {
      console.error(`Помилка: Персонажа з ім'ям "${name}" не знайдено.`);
      process.exit(1);
    }
    console.log(`=== Характеристики персонажа: ${char.name} ===`);
    console.log(`Здоров'я: ${char.health}`);
    console.log(`Головний персонаж: ${char.is_main ? 'Так' : 'Ні'}`);
    console.log(`Клуб: ${char.club || 'Не перебуває в клубі'}`);
    console.log('Додаткова статистика:');
    if (char.stats) {
      Object.entries(char.stats).forEach(([stat, value]) => {
        console.log(`  - ${stat}: ${value !== null ? value : 'відсутньо (null)'}`);
      });
    }
  });

program
  .command('inventory')
  .description('Переглянути інвентар персонажа')
  .argument('<name>', 'ім\'я персонажа')
  .option('-p, --min-power <number>', 'показати предмети з силю не менше вказаної', parseInt)
  .action((name, options) => {
    const data = loadData();
    const characters = data.characters || [];
    const char = characters.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (!char) {
      console.error(`Помилка: Персонажа з ім'ям "${name}" не знайдено.`);
      process.exit(1);
    }
    let items = char.inventory || [];
    if (options.minPower && !isNaN(options.minPower)) {
      items = items.filter((item) => item.inventory_power >= options.minPower);
    }
    console.log(`--- Інвентар персонажа ${char.name} (знайдено елементів: ${items.length}) ---`);
    items.forEach((item) => {
      console.log(`* Предмет: ${item.inventory_name} | Сила: ${item.inventory_power}`);
    });
  });

program
  .command('item-info')
  .description('Відомості про конкретний предмет з інвентарю')
  .argument('<itemName>', 'назва предмета в інвентарі')
  .action((itemName) => {
    const data = loadData();
    const characters = data.characters || [];
    let foundItem = null;
    let ownerName = '';
    for (const char of characters) {
      const item = (char.inventory || []).find(
        (i) => i.inventory_name.toLowerCase() === itemName.toLowerCase()
      );
      if (item) {
        foundItem = item;
        ownerName = char.name;
        break;
      }
    }
    if (!foundItem) {
      console.error(`Помилка: Предмет з назвою "${itemName}" не знайдено.`);
      process.exit(1);
    }
    console.log(`=== Інформація про предмет: ${foundItem.inventory_name} ===`);
    console.log(`Власник: ${ownerName}`);
    console.log(`Сила предмета: ${foundItem.inventory_power}`);
  });

program.parse(process.argv);
