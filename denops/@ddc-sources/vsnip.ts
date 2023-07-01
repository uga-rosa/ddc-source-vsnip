import {
  BaseSource,
  DdcGatherItems,
  Item,
} from "https://deno.land/x/ddc_vim@v3.7.2/types.ts";
import {
  GatherArguments,
  OnCompleteDoneArguments,
  OnInitArguments,
} from "https://deno.land/x/ddc_vim@v3.7.2/base/source.ts";
import {
  autocmd,
  Denops,
  fn,
} from "https://deno.land/x/ddc_vim@v3.7.2/deps.ts";

type UserData = {
  vsnip: {
    snippet: string[];
  };
};

type Params = Record<string, never>;

export class Source extends BaseSource<Params> {
  async onInit({
    denops,
  }: OnInitArguments<Params>): Promise<void> {
    await autocmd.remove(denops, ["CompleteDone", "CompleteDonePre"], "*", {
      group: "vsnip_integ",
    });
    await autocmd.remove(denops, "User", "vsnip#expand", {
      group: "vsnip_integ",
    });
  }

  async gather({
    denops,
  }: GatherArguments<Params>): Promise<DdcGatherItems<UserData>> {
    const items = await denops.call(
      "vsnip#get_complete_items",
      await fn.bufnr(denops),
    ) as Item<string>[];
    return items.map((item) => ({
      ...item,
      user_data: JSON.parse(item.user_data!),
    }));
  }

  async onCompleteDone({
    denops,
  }: OnCompleteDoneArguments<Params, UserData>): Promise<void> {
    // Not expanded if confirmed with additional input.
    const itemWord = await denops.eval(`v:completed_item.word`) as string;
    const ctx = await LineContext.create(denops);
    if (!ctx.text.endsWith(itemWord, ctx.character)) {
      return;
    }

    await denops.call("vsnip#expand");
  }

  params(): Params {
    return {};
  }
}

class LineContext {
  // utf-16 offset
  character: number;
  text: string;

  constructor(
    character: number,
    text: string,
  ) {
    this.character = character;
    this.text = text;
  }

  static async create(
    denops: Denops,
  ) {
    const beforeLine = await denops.eval(
      `getline('.')[:col('.')-2]`,
    ) as string;
    const character = beforeLine.length;
    const text = await fn.getline(denops, ".");
    return new LineContext(character, text);
  }
}