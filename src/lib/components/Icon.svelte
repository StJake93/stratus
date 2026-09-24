<script lang="ts">
  import { ICONS } from './icons';

  let { name, size = 18, stroke = 2, class: cls = '' }: { name: string; size?: number; stroke?: number; class?: string } = $props();
  const Cmp = $derived(ICONS[name] ?? ICONS.box);
</script>

<Cmp {size} strokeWidth={stroke} class={cls} aria-hidden="true" />
