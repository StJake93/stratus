<script lang="ts">
  let {
    label,
    value = $bindable(),
    min = 0,
    max = 100,
    step = 1,
    format = (v: number) => String(v),
    valuetext
  }: {
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    format?: (v: number) => string;
    /** Spoken value for screen readers; defaults to the formatted display value. */
    valuetext?: (v: number) => string;
  } = $props();

  const id = `range-${Math.random().toString(36).slice(2, 8)}`;
  const pct = $derived(((value - min) / (max - min)) * 100);
</script>

<div class="ctl">
  <label for={id}>
    <span>{label}</span>
    <output for={id} aria-hidden="true">{format(value)}</output>
  </label>
  <input {id} type="range" {min} {max} {step} bind:value style:--pct="{pct}%" aria-valuetext={(valuetext ?? format)(value)} />
</div>
