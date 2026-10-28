import { Children, Fragment, type ReactNode } from 'react';
import { View } from 'react-native';

import { makeStyles } from '@/theme';

import { Text } from './Text';

type Props = {
  title?: string;
  footer?: string;
  children: ReactNode;
};

/** Grupo de linhas (ListRow) num cartão, com divisores finos entre elas. */
export function ListGroup({ title, footer, children }: Props) {
  const styles = useStyles();
  const items = Children.toArray(children).filter(Boolean);

  return (
    <View style={styles.wrapper}>
      {title && (
        <Text variant="label" color="textMuted" accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      )}
      <View style={styles.group}>
        {items.map((child, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={styles.divider} />}
            {child}
          </Fragment>
        ))}
      </View>
      {footer && (
        <Text variant="caption" color="textMuted" style={styles.footer}>
          {footer}
        </Text>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrapper: { gap: t.spacing.sm },
  title: { paddingHorizontal: t.spacing.xs, textTransform: 'uppercase', letterSpacing: t.tracking.caps },
  group: {
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginLeft: t.spacing.lg + t.sizes.badge.md + t.spacing.md,
  },
  footer: { paddingHorizontal: t.spacing.xs },
}));
