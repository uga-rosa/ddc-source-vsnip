import {
  BaseSource,
  DdcGatherItems,
  Item,
  Previewer,
} from "https://deno.land/x/ddc_vim@v4.0.2/types.ts";
import {
  GatherArguments,
  GetPreviewerArguments,
  OnCompleteDoneArguments,
} from "https://deno.land/x/ddc_vim@v4.0.2/base/source.ts";
import { Denops, fn, op } from "https://deno.land/x/ddc_vim@v4.0.2/deps.ts";

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
    const beforeLine = await denops.eval(
      `getline('.')[:col('.')-2]`,
    ) as string;
    if (!beforeLine.endsWith(itemWord)) {
      return;
    }

    await denops.call("vsnip#expand");

    await denops.call("ddc#skip_next_complete");
  }

  async getPreviewer({
    denops,
    item,
  }: GetPreviewerArguments<Params, UserData>): Promise<Previewer> {
    const userData = item.user_data;
    if (userData === undefined) {
      return { kind: "empty" };
    }
    const contents = await this.snippetToString(denops, userData.vsnip.snippet)
      .then((body) => body.replaceAll(/\r\n?/g, "\n").split("\n"));
    const filetype = await op.filetype.get(denops);
    contents.unshift("```" + filetype);
    contents.push("```");
    return { kind: "markdown", contents };
  }

  async snippetToString(
    denops: Denops,
    text: string | string[],
  ): Promise<string> {
    return await denops.call("vsnip#to_string", text) as string;
  }

  params(): Params {
    return {
      menu: true,
    };
  }
}
