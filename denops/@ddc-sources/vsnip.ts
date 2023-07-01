import {
  BaseSource,
  DdcGatherItems,
  Item,
} from "https://deno.land/x/ddc_vim@v3.7.2/types.ts";
import {
  GatherArguments,
  OnCompleteDoneArguments,
} from "https://deno.land/x/ddc_vim@v3.7.2/base/source.ts";
import { Denops, fn } from "https://deno.land/x/ddc_vim@v3.7.2/deps.ts";

type UserData = {
  vsnip: {
    snippet: string[];
  };
};

type Params = {
  menu: boolean;
};

export class Source extends BaseSource<Params> {
  async gather({
    denops,
    sourceParams,
  }: GatherArguments<Params>): Promise<DdcGatherItems<UserData>> {
    const items = await denops.call(
      "vsnip#get_complete_items",
      await fn.bufnr(denops),
    ) as Item<string>[];
    return items.map((item) => ({
      ...item,
      menu: sourceParams.menu ? item.menu : "",
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
    return {
      menu: true,
    };
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
