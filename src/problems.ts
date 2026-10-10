import { HttpError } from "./errors.ts";
import { mediaLimits } from "./media.ts";

type Label = [string, string];
type Question = {
  id: string;
  label: Label;
  step: 1 | 2;
  required?: boolean;
  hint?: Label;
  choices?: Label[];
  summaryPrefix?: Label;
  choiceSets?: { field: string; values: string[]; choices: Label[] }[];
  clears?: string[];
  uncertainSummary?: Label;
  hiddenWhen?: { field: string; values: string[] };
};
const pair = (en: string, zh: string): Label => [en, zh];
const unsure = pair("Not sure", "不确定");
const question = (
  id: string,
  en: string,
  zh: string,
  options: Omit<Question, "id" | "label">,
): Question => ({ id, label: pair(en, zh), ...options });

// The form, quick choices, summary and server validation share these definitions.
export const problemSchema = {
  version: 1,
  mediaLimits,
  common: [
    question("location", "Where is the problem?", "问题在哪里？", {
      step: 1,
      required: true,
      choices: [
        pair("Kitchen", "厨房"),
        pair("Bathroom", "浴室"),
        pair("Bedroom", "卧室"),
        pair("Living room", "客厅"),
        unsure,
      ],
      hint: pair(
        "Choose a room or describe the location in your own words.",
        "选择房间，或用自己的话描述位置。",
      ),
    }),
    question("observation", "What are you noticing?", "你观察到了什么？", {
      step: 1,
      required: true,
      hint: pair(
        "Describe what you see or hear. ‘Not sure’ is okay; no diagnosis needed.",
        "描述你看到或听到的情况。可以选“不确定”，无需判断原因。",
      ),
      choices: [unsure],
    }),
    question("started", "When did it start?", "什么时候开始的？", {
      step: 2,
      choices: [
        pair("Today", "今天"),
        pair("Yesterday", "昨天"),
        pair("This week", "本周"),
        unsure,
      ],
      summaryPrefix: pair("It started ", "开始时间："),
      uncertainSummary: pair(
        "I'm not sure when it started",
        "不确定什么时候开始",
      ),
    }),
    question("frequency", "When does it happen?", "什么情况下发生？", {
      step: 2,
      choices: [
        pair("All the time", "一直"),
        pair("Sometimes", "偶尔"),
        unsure,
      ],
      summaryPrefix: pair("It happens ", "发生情况："),
      uncertainSummary: pair(
        "I'm not sure when it happens",
        "不确定什么情况下发生",
      ),
      choiceSets: [
        {
          field: "fixture",
          values: ["Toilet", "马桶"],
          choices: [
            pair("When flushing", "冲水时"),
            pair("After using it", "使用后"),
            pair("All the time", "一直"),
            unsure,
          ],
        },
        {
          field: "fixture",
          values: ["Shower", "淋浴"],
          choices: [
            pair("When the shower is running", "淋浴打开时"),
            pair("After using it", "使用后"),
            pair("All the time", "一直"),
            unsure,
          ],
        },
      ],
    }),
    question("tried", "Have you tried anything?", "已经尝试过什么？", {
      step: 2,
      hint: pair(
        "For example, placed a bucket underneath. No need to try a repair.",
        "例如在下面放了水桶。无需尝试维修。",
      ),
      choices: [pair("Nothing yet", "还没有")],
      summaryPrefix: pair("I've tried: ", "已经尝试："),
    }),
    question("severity", "How much is it affecting you?", "影响有多大？", {
      step: 2,
      choices: [
        pair("Small inconvenience", "轻微不便"),
        pair("Cannot use it", "无法使用"),
        pair("Getting worse", "正在恶化"),
        unsure,
      ],
      hint: pair(
        "Optional — your own assessment, not a diagnosis.",
        "选填：按自己的感受描述，无需诊断。",
      ),
      summaryPrefix: pair("Impact: ", "影响："),
    }),
    question("notes", "Anything else to share?", "还有什么要补充的？", {
      step: 2,
      summaryPrefix: pair("Additional details: ", "补充："),
    }),
  ],
  categories: [
    {
      id: "plumbing",
      label: pair("Plumbing", "水管与漏水"),
      summarySubject: "fixture",
      uncertaintyPrompt: pair(
        "Not sure of the source? A photo of the area or a simple observation such as where water collects can help. You can continue without a photo.",
        "不确定源头？可以拍摄现场，或描述水积在哪里。不提供照片也可以继续。",
      ),
      commonChoices: {
        observation: [
          pair("Water is leaking", "正在漏水"),
          pair("Water is not draining", "无法排水"),
          pair("Low water pressure", "水压低"),
          unsure,
        ],
        frequency: [
          pair("When the faucet is running", "水龙头打开时"),
          pair("After using it", "使用后"),
          pair("All the time", "一直"),
          pair("Sometimes", "偶尔"),
          unsure,
        ],
      },
      questions: [
        question(
          "fixture",
          "Which fixture needs attention?",
          "哪个设施有问题？",
          {
            step: 1,
            choices: [
              pair("Kitchen sink", "厨房水槽"),
              pair("Faucet", "水龙头"),
              pair("Toilet", "马桶"),
              pair("Shower", "淋浴"),
              pair("Pipe", "水管"),
              unsure,
            ],
            clears: ["water", "frequency"],
            summaryPrefix: pair("Affected fixture: ", "相关设施："),
          },
        ),
        question(
          "water",
          "Where does it seem to come from?",
          "看起来从哪里漏出？",
          {
            step: 1,
            choices: [
              pair("Under the sink", "水槽下面"),
              pair("From the faucet", "水龙头"),
              pair("Pipe under the basin", "水槽下的水管"),
              pair("Around the drain", "排水口周围"),
              unsure,
            ],
            choiceSets: [
              {
                field: "fixture",
                values: ["Toilet", "马桶"],
                choices: [
                  pair("Around the base", "底座周围"),
                  pair("From the tank", "水箱"),
                  pair("Supply pipe", "供水管"),
                  unsure,
                ],
              },
              {
                field: "fixture",
                values: ["Shower", "淋浴"],
                choices: [
                  pair("Shower head", "花洒"),
                  pair("Around the drain", "排水口周围"),
                  pair("Shower hose", "淋浴软管"),
                  unsure,
                ],
              },
              {
                field: "fixture",
                values: ["Faucet", "水龙头"],
                choices: [
                  pair("From the spout", "出水口"),
                  pair("Around the handle", "把手周围"),
                  pair("At the base", "底部"),
                  unsure,
                ],
              },
              {
                field: "fixture",
                values: ["Pipe", "水管"],
                choices: [
                  pair("At a joint", "接口处"),
                  pair("Along the pipe", "管身"),
                  unsure,
                ],
              },
              {
                field: "fixture",
                values: ["Not sure", "不确定"],
                choices: [
                  pair("Water on the floor", "地面有水"),
                  pair("Inside a cabinet", "柜子里面"),
                  unsure,
                ],
              },
            ],
            summaryPrefix: pair("It appears to come from ", "看起来源自："),
            uncertainSummary: pair(
              "I'm not sure where it comes from",
              "不确定源头在哪里",
            ),
            hiddenWhen: {
              field: "observation",
              values: [
                "Water is not draining",
                "无法排水",
                "Low water pressure",
                "水压低",
              ],
            },
          },
        ),
      ],
    },
    {
      id: "walls",
      label: pair("Walls and patching", "墙面与修补"),
      uncertaintyPrompt: pair(
        "Not sure what the damage is? A photo or a description of the shape and size can help. You can skip measurements.",
        "不确定是什么损坏？可以拍照或描述形状和大小，无需测量。",
      ),
      commonChoices: {
        observation: [
          pair("There is a hole", "有一个洞"),
          pair("There is a crack", "有裂缝"),
          pair("Paint is peeling", "油漆脱落"),
          pair("There is a stain", "有污渍"),
          unsure,
        ],
        frequency: [
          pair("Always visible", "一直可见"),
          pair("Getting larger", "正在扩大"),
          unsure,
        ],
      },
      questions: [
        question(
          "damage",
          "What kind of damage do you see?",
          "看到了什么损坏？",
          {
            step: 1,
            choices: [
              pair("Hole", "洞"),
              pair("Crack", "裂缝"),
              pair("Peeling", "脱皮"),
              pair("Staining", "污渍"),
              unsure,
            ],
            summaryPrefix: pair("Visible damage: ", "可见损坏："),
          },
        ),
        question("size", "Approximately how large is it?", "大概有多大？", {
          step: 2,
          choices: [
            pair("Coin-sized", "硬币大小"),
            pair("Palm-sized", "手掌大小"),
            pair("Larger than a palm", "比手掌大"),
            unsure,
          ],
          summaryPrefix: pair("Approximate size: ", "大概大小："),
        }),
      ],
    },
    {
      id: "electrical",
      label: pair("Electrical", "电气问题"),
      summarySubject: "device",
      uncertaintyPrompt: pair(
        "Not sure which device is affected? Describe what you notice, such as flickering or loss of power. A photo is optional; no inspection or repair is needed.",
        "不确定哪个设备有问题？描述闪烁或断电等现象即可。照片选填，无需检查或维修。",
      ),
      commonChoices: {
        observation: [
          pair("Lights are flickering", "灯在闪烁"),
          pair("There is no power", "没有电"),
          pair("The device stops working", "设备停止工作"),
          unsure,
        ],
        frequency: [
          pair("When switched on", "打开时"),
          pair("Sometimes", "偶尔"),
          pair("All the time", "一直"),
          unsure,
        ],
      },
      questions: [
        question(
          "device",
          "Which light, outlet, or device is affected?",
          "哪个灯、插座或设备有问题？",
          {
            step: 1,
            choices: [
              pair("Light", "灯"),
              pair("Outlet", "插座"),
              pair("Appliance", "电器"),
              unsure,
            ],
            summaryPrefix: pair("Affected item: ", "相关设备："),
          },
        ),
        question(
          "extent",
          "Is it one location or several?",
          "一个位置还是多个位置？",
          {
            step: 2,
            choices: [
              pair("One location", "一个位置"),
              pair("Several locations", "多个位置"),
              unsure,
            ],
            summaryPrefix: pair("Affected area: ", "影响范围："),
          },
        ),
      ],
    },
    {
      id: "other",
      label: pair("Other / unsure", "其他 / 不确定"),
      uncertaintyPrompt: pair(
        "Not sure what to call it? Describe what you see or hear, or add a photo. You do not need to guess the cause.",
        "不知道怎么称呼？描述看到或听到的情况，或添加照片，无需猜测原因。",
      ),
      commonChoices: {},
      questions: [] as Question[],
    },
  ],
};

export type ProblemReport = {
  version: number;
  category: { id: string; label: Label };
  fields: { id: string; label: Label; value: string }[];
};

export function requireReport(value: unknown): ProblemReport {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new HttpError(400, "Expected a problem report.");
  const input = value as Record<string, unknown>;
  const category = problemSchema.categories.find(
    (c) => c.id === input.categoryId,
  );
  if (input.version !== problemSchema.version || !category)
    throw new HttpError(400, "Unknown problem category or version.");
  if (
    !input.answers ||
    typeof input.answers !== "object" ||
    Array.isArray(input.answers)
  )
    throw new HttpError(400, "Expected problem answers.");
  const answers = input.answers as Record<string, unknown>;
  const questions = [...problemSchema.common, ...category.questions];
  if (Object.keys(answers).some((id) => !questions.some((q) => q.id === id)))
    throw new HttpError(400, "Unexpected question for this category.");
  const fields: ProblemReport["fields"] = [];
  for (const q of questions) {
    const answer = answers[q.id];
    if (
      answer !== undefined &&
      (typeof answer !== "string" || answer.length > 500)
    )
      throw new HttpError(
        400,
        "Answers must be text of at most 500 characters.",
      );
    const text = typeof answer === "string" ? answer.trim() : "";
    if (q.required && !text)
      throw new HttpError(400, `Required: ${q.label[0]}`);
    if (text) fields.push({ id: q.id, label: [...q.label], value: text });
  }
  return {
    version: problemSchema.version,
    category: { id: category.id, label: [...category.label] },
    fields,
  };
}
