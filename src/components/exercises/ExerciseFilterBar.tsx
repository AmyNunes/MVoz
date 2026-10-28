import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Chip, Sheet, Text } from '@/components/ui';
import { CATEGORY_ICONS } from '@/exercises/catalog';
import type { ExerciseFilters } from '@/exercises/filter';
import { CATEGORIES, GOALS, LEVELS, type Category } from '@/exercises/model';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const x = strings.exercises;

type Props = {
  filters: ExerciseFilters;
  onChange: (next: ExerciseFilters) => void;
};

/** Categorias numa linha rolável; objetivo e nível num sheet ("Filtros"), mostrados como chips. */
export function ExerciseFilterBar({ filters, onChange }: Props) {
  const styles = useStyles();
  const [sheet, setSheet] = useState(false);

  const toggleCategory = (category: Category) => {
    const has = filters.categories.includes(category);
    onChange({
      ...filters,
      categories: has ? filters.categories.filter((c) => c !== category) : [...filters.categories, category],
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Chip label={x.filtersLabel} icon="sliders" onPress={() => setSheet(true)} />
        {filters.goal && (
          <Chip
            label={x.goals[filters.goal]}
            selected
            trailingIcon="x"
            onPress={() => onChange({ ...filters, goal: null })}
          />
        )}
        {filters.level && (
          <Chip
            label={x.levels[filters.level]}
            selected
            trailingIcon="x"
            onPress={() => onChange({ ...filters, level: null })}
          />
        )}
        {CATEGORIES.map((category) => (
          <Chip
            key={category}
            label={x.categories[category]}
            icon={CATEGORY_ICONS[category]}
            selected={filters.categories.includes(category)}
            onPress={() => toggleCategory(category)}
          />
        ))}
      </ScrollView>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title={x.filtersLabel}>
        <Text variant="label" color="textMuted">
          {x.goalsLabel}
        </Text>
        <View style={styles.wrap}>
          {GOALS.map((goal) => (
            <Chip
              key={goal}
              label={x.goals[goal]}
              selected={filters.goal === goal}
              onPress={() => onChange({ ...filters, goal: filters.goal === goal ? null : goal })}
            />
          ))}
        </View>
        <Text variant="label" color="textMuted">
          {x.levelsLabel}
        </Text>
        <View style={styles.wrap}>
          {LEVELS.map((level) => (
            <Chip
              key={level}
              label={x.levels[level]}
              selected={filters.level === level}
              onPress={() => onChange({ ...filters, level: filters.level === level ? null : level })}
            />
          ))}
        </View>
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { marginHorizontal: -t.spacing.screen },
  row: { gap: t.spacing.sm, paddingHorizontal: t.spacing.screen },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
}));
