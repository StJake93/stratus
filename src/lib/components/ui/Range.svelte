<script lang="ts">
  let {
    label,
    value = $bindable(),
    min = 0,
    max = 100,
    step = 1,
    format = (v: number) => String(v)
  }: { label: string; value: number; min?: number; max?: number; step?: number; format?: (v: number) => string } = $props();

  const pct = $derived(((value - min) / (max - min)) * 100);
</script>

<div class="ctl">
  <label>
    <span>{label}</span>
    <output>{format(value)}</output>
  </label>
  <input type="range" {min} {max} {step} bind:value style:--pct="{pct}%" aria-label={label} />
</div>
