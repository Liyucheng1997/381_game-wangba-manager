// 剧情脚本：人物表 + 十天主线
// 对话行格式：[说话人, 文本]；说话人 me=主角 sys=旁白
// 控制节点：{choice:[{t, do, then}]} / {if, then, else} / {do}


export const CAST = {
  me: { name: '我', title: '网管 · 林小川', look: { gender: 'm', hair: 'messy', top: 'staff', topColor: 0x2a2d36, topColor2: 0x14161a, pants: 0x26324a, shoes: 0xeeeeee, skin: 0xf1c9a5, hairColor: 0x1a1410, height: 1.0, build: 1, glasses: false } },
  sys: { name: '', title: '' },
  uncle: { name: '舅舅', title: '极速网吧老板 · 刘建国', look: { gender: 'm', hair: 'bald', top: 'leather', topColor: 0x2a1a12, topColor2: 0x2a1a12, pants: 0x2a2a2e, skin: 0xdba57a, hairColor: 0x2d2018, height: 1.02, build: 1.25, glasses: false } },
  laowang: { name: '老王', title: '下岗钳工 · CS老炮“Sniper王”', look: { gender: 'm', hair: 'buzz', top: 'down', topColor: 0x3a4a2a, topColor2: 0x2a3a1a, pants: 0x3a3328, skin: 0xc98e62, hairColor: 0x2d2018, height: 1.02, build: 1.1, glasses: false, cap: false } },
  xiaomei: { name: '小美', title: '奶茶店店员 · 劲舞天团九级', look: { gender: 'f', hair: 'long', top: 'down', topColor: 0xe86aa8, topColor2: 0xffffff, pants: 0x1f2a44, skin: 0xf5d3b5, hairColor: 0x6b3a1e, height: 0.95, build: 0.92, glasses: false } },
  boven: { name: '周博文', title: '复读生 · 人称“眼镜”', look: { gender: 'm', hair: 'side', top: 'sweater', topColor: 0x5a6a7a, topColor2: 0x8a2a2a, pants: 0x2a2a2e, skin: 0xf1c9a5, hairColor: 0x14100c, height: 0.98, build: 0.88, glasses: true } },
  xiaopang: { name: '小胖', title: '初二学生 · 刘浩', look: { gender: 'm', hair: 'bowl', top: 'uniform', topColor: 0x2a5aa8, topColor2: 0x1a2a6a, pants: 0x2a5aa8, skin: 0xf5d3b5, hairColor: 0x1a1410, height: 0.84, build: 1.25, glasses: false, backpack: true } },
  zhangayi: { name: '张阿姨', title: '小胖他妈 · 菜市场卖菜', look: { gender: 'f', hair: 'bob', top: 'down', topColor: 0x8a1a2a, topColor2: 0x5a0a1a, pants: 0x1a1a1a, skin: 0xdba57a, hairColor: 0x14100c, height: 0.94, build: 1.2, glasses: false } },
  heige: { name: '黑哥', title: '街溜子 · 赵黑子', look: { gender: 'm', hair: 'spiky', top: 'leather', topColor: 0x111111, topColor2: 0x111111, pants: 0x1a1a1a, skin: 0xc98e62, hairColor: 0xb07a3a, height: 1.04, build: 1.0, glasses: false } },
  qianzong: { name: '钱总', title: '天网电竞馆老板 · 钱多多', look: { gender: 'm', hair: 'side', top: 'jacket', topColor: 0x1a1a2a, topColor2: 0xd8d0c0, pants: 0x1a1a1a, skin: 0xe8b88f, hairColor: 0x14100c, height: 1.0, build: 1.25, glasses: true } },
  likezhang: { name: '李科长', title: '县文化局 · 市场科', look: { gender: 'm', hair: 'short', top: 'jacket', topColor: 0x1f2a3a, topColor2: 0x1f2a3a, pants: 0x1f2a3a, skin: 0xe8b88f, hairColor: 0x221a14, height: 1.0, build: 1.0, glasses: true } },
  police: { name: '民警小刘', title: '城关派出所', look: { gender: 'm', hair: 'short', top: 'jacket', topColor: 0x1a2a4a, topColor2: 0x1a2a4a, pants: 0x1a2a4a, skin: 0xe8b88f, hairColor: 0x14100c, height: 1.03, build: 1.0, glasses: false, cap: true } },
  zhaolaoban: { name: '赵老板', title: '房东', look: { gender: 'm', hair: 'bald', top: 'sweater', topColor: 0x6a5a3a, topColor2: 0x3a2a1a, pants: 0x3a3328, skin: 0xdba57a, hairColor: 0x3b2a1e, height: 0.98, build: 1.25, glasses: false } },
  afang: { name: '阿芳', title: '收银员', look: { gender: 'f', hair: 'ponytail', top: 'staff', topColor: 0x2a2d36, topColor2: 0x14161a, pants: 0x1a1a1a, skin: 0xf5d3b5, hairColor: 0x221a14, height: 0.95, build: 0.92 } },
  wangayi: { name: '王阿姨', title: '保洁', look: { gender: 'f', hair: 'bob', top: 'jacket', topColor: 0x3a6a8a, topColor2: 0x3a6a8a, pants: 0x2a2a2e, skin: 0xdba57a, hairColor: 0x3b2a1e, height: 0.93, build: 1.15 } },
};

const L = (s, t) => [s, t];

// 张阿姨找儿子（在小胖开卡/被拒后一段时间触发）
const ZHANG_TALK = [
  { if: (g) => g.flags.letPangIn && !!g.findNamed('xiaopang'), then: [
    L('zhangayi', '刘浩！！刘浩你给我出来！！'),
    L('sys', '一个系着围裙的大婶冲了进来，一眼就看到了角落里的小胖。'),
    L('xiaopang', '妈……妈？！'),
    L('zhangayi', '期末考还有一个礼拜你在这打游戏？！'),
    L('zhangayi', '还有你！你这个网管！放一个初中生进来，你良心让狗吃了？！我要去文化局告你们！'),
    L('sys', '全店的目光都盯着你。几个客人摇着头结账走了。'),
    { do: (g) => { g.rep(-10); g.flag('zhangAngry', true); g.kickNamed('xiaopang'); } },
  ], else: [
    L('zhangayi', '小伙子，你见着一个胖乎乎的、穿二中校服的孩子没？'),
    { if: (g) => g.flags.refusedPang, then: [
      L('me', '下午来过，我没让他进，让他回家写作业了。'),
      L('zhangayi', '哎呀！好人呐！现在的网吧哪个不是见钱眼开，你这孩子心眼正！'),
      L('zhangayi', '明儿我给你送饺子来！猪肉白菜馅儿的！'),
      { do: (g) => { g.rep(5); g.flag('zhangThanks', true); } },
    ], else: [
      L('me', '没见着啊阿姨。'),
      L('zhangayi', '这死孩子，跑哪去了……'),
    ] },
  ] },
];
const scheduleZhang = (g) => { if (!g.flags.zhangScheduled) { g.flag('zhangScheduled', true); g.later(1.4, (g) => g.spawnVisitor('zhangayi', { onTalk: ZHANG_TALK })); } };

// 舅舅每晚电话
function uncleCall(day) {
  return [
    L('sys', '叮铃铃——柜台上的红色座机响了。'),
    { if: (g) => g.dayStats.net >= 700, then: [L('uncle', `小川！今天流水${'{net}'}块？可以啊，比我在的时候还强！`)],
      else: [{ if: (g) => g.dayStats.net >= 400, then: [L('uncle', '今天收了{net}块，还行，稳住。')], else: [L('uncle', '才{net}块……小川啊，再这么下去，房租可就悬了。')] }] },
    { if: (g) => g.state.rep >= 70, then: [L('uncle', '刚才隔壁小卖部老孙还跟我夸你，说咱网吧现在口碑好着呢。')] },
    { if: (g) => g.state.rep < 35, then: [L('uncle', '我听说有客人在外头骂咱家……服务得跟上啊。')] },
    L('uncle', `离交房租还有${'{left}'}天，差${'{gap}'}块。你舅妈这边手术挺顺利，你别担心。`),
  ];
}

export const DAYS = [
  null,
  // ================= 第一天 =================
  {
    date: '2006年12月18日 星期一', weather: '晴 -3℃', title: '第一天 · 临危受命',
    intro: [
      L('sys', '2006年冬，北方小城青石县。'),
      L('sys', '高考落榜后，我在家躺了半年。直到那天清晨，舅舅一个电话把我叫到了“极速网吧”。'),
      L('uncle', '小川，你舅妈住院要做手术，我得去省城陪半个月。'),
      L('uncle', '网吧这摊子，交给你了。'),
      L('me', '我？舅，我就会打CS啊……'),
      L('uncle', '会打CS就够了！当网管，一半靠手艺，一半靠眼力见儿。'),
      L('uncle', '说句实话，店里欠了房东赵老板三个月房租。十天后，也就是27号，得把这{target}块交上。'),
      L('uncle', '交不上……这店就得让给对门那个要开“电竞馆”的。'),
      L('me', '{target}？！'),
      L('uncle', '柜台里给你留了1000块周转。我教你几招，听好了——'),
      L('sys', '【操作】鼠标左键点地面移动；右键拖动旋转视角；滚轮缩放。WASD 也能走。'),
      L('sys', '【开卡】客人到前台排队，点他就会走到收银位帮他开机。看着面嫩的，记得查身份证。'),
      L('sys', '【服务】头顶冒图标的客人有需求：🍜去货架拿泡面→饮水机接热水→送过去；🥤去冰柜拿饮料；🎧去耳机架拿耳机；💻点他修电脑。'),
      L('sys', '【打扫】客人走后桌上留下垃圾，点一下座位就能收拾。脏桌子没人愿意坐。'),
      L('uncle', '晚上收工我给你打电话。记住，客人就是爷，但未成年的爷不能放进来！'),
      L('sys', '舅舅拍拍我的肩膀，拎着蛇皮袋走出了门帘。'),
      L('me', '……好吧，林小川，网管生涯，开始了。'),
    ],
    events: [
      { at: 9.2, do: (g) => g.hint('第一位客人来了，点击排在前台的客人帮他开卡！') },
    ],
    outro: uncleCall(1),
  },
  // ================= 第二天 =================
  {
    date: '2006年12月19日 星期二', weather: '多云 -5℃', title: '第二天 · 老炮与舞后',
    intro: [
      L('sys', '早上九点，拉开卷帘门。昨晚的泡面味还没散。'),
      L('me', '今天得把机器都擦一遍……'),
    ],
    events: [
      {
        at: 10.0, do: (g) => g.spawnNamed('laowang', {
          hours: 7, seat: 'C4', program: 'cs0',
          onCheckin: [
            L('laowang', '哟，生面孔？建国呢？'),
            L('me', '我舅去省城了，这几天我看店。我叫林小川。'),
            L('laowang', '建国的外甥啊。我姓王，大伙都叫我老王。老位置，C4，包七个钟。'),
            L('laowang', '对了，先给我整桶泡面，红烧牛肉的，热水要滚的啊。'),
            L('sys', '【提示】去货架拿泡面 → 到饮水机接热水 → 送到老王座位。'),
          ],
          afterSeat: (c) => c.forceNeed('noodle', 1.2),
          onServe: (g, type) => {
            if (type === 'noodle') { g.aff('laowang', 1); g.sayLater([L('laowang', '嗯，够烫！小子手脚挺麻利。')]); }
            if (type === 'crash') { g.aff('laowang', 1); g.sayLater([L('laowang', '好小子！比建国修得还快！这局要是赢了，我请你吃烤串！')]); }
          },
        }),
      },
      {
        at: 15.3, do: (g) => g.spawnNamed('xiaomei', {
          hours: 4, seat: null, program: 'dance0',
          onCheckin: [
            L('xiaomei', '嗨～新来的网管？好年轻哦。'),
            L('xiaomei', '开台机子！要声卡好的那台哦，我要上劲舞天团，今天冲九级P键！'),
            L('me', '（九级……那是神仙手速吧。）'),
          ],
          afterSeat: (c) => c.forceNeed('drink', 1.5, 0.6),
          onServe: (g, type) => { if (type === 'drink') { g.aff('xiaomei', 1); g.sayLater([L('xiaomei', '谢啦！下回请你喝我们店的珍珠奶茶～')]); } },
        }),
      },
      {
        at: 19.5, do: (g) => {
          const c = g.findNamed('laowang');
          if (c && c.seated) {
            c.forceNeed('crash', 1.6);
            g.sayLater([L('laowang', '卧槽！！关键局蓝屏了！网管！！网管——！'), L('sys', '【提示】点击老王的座位去修电脑。根据故障现象选择正确的处理方法。')]);
          }
        },
      },
    ],
    outro: [
      { if: (g) => g.state.aff.laowang >= 2, then: [L('laowang', '小川，今天这电脑修得利索。以后有啥事吱一声，在这条街上，老王还有点面子。')] },
      ...uncleCall(2),
    ],
  },
  // ================= 第三天 =================
  {
    date: '2006年12月20日 星期三', weather: '小雪 -6℃', title: '第三天 · 小胖的谎言',
    intro: [
      L('sys', '外面飘起了小雪。路过的中学生缩着脖子，眼睛却一个劲往网吧里瞟。'),
      L('me', '期末考快到了吧……这帮小崽子。'),
      L('sys', '【提示】从今天开始会有未成年人混进来。个子矮、穿校服、背书包的要格外留意，可以“查身份证”。'),
    ],
    mods: { minors: true },
    events: [
      {
        at: 12.5, do: (g) => g.spawnNamed('boven', {
          hours: 3, seat: null, program: 'qq1', paid: false,
          onCheckin: [
            L('boven', '那个……网管，能问一下吗，你们这儿能装Visual Basic吗？'),
            L('me', 'VB？你要写程序？'),
            L('boven', '嗯！我在自学编程，想考计算机系……就是，我只有五块钱，这周的饭钱……'),
            {
              choice: [
                { t: '“五块钱你留着吃饭，让你免费用三个钟。”', do: (g) => { g.flag('bovenFriend', true); g.aff('boven', 3); }, then: [L('boven', '真、真的？！谢谢哥！我以后一定报答你！'), L('me', '（这孩子眼睛里有光。）')] },
                { t: '“按规矩收钱，不过给你挑台快的。”', do: (g) => { g.money(5, 'net', '周博文上机'); g.aff('boven', 1); }, then: [L('boven', '好……谢谢。')] },
                { t: '“帮我把这几台机器的系统维护一下，抵网费。”', do: (g) => { g.flag('bovenFriend', true); g.flag('bovenHelper', true); g.aff('boven', 2); g.reduceCrash(); }, then: [L('boven', '没问题！我会装还原、清注册表，这些我在行！'), L('sys', '周博文帮你优化了几台电脑，今天死机的概率降低了。')] },
              ],
            },
          ],
        }),
      },
      {
        at: 16.4, do: (g) => g.spawnNamed('xiaopang', {
          hours: 3, seat: null, program: 'legend0', minor: true, special: true,
          onCheckin: [
            L('xiaopang', '网、网管哥哥，开台机子。'),
            L('me', '你多大了？'),
            L('xiaopang', '十、十八！我高三了！就是长得显小……'),
            L('sys', '他校服上印着“青石二中 初二(3)班”。'),
            {
              choice: [
                { t: '“身份证拿来我看看。”', then: [
                  L('xiaopang', '我……忘带了。哥，就玩一会儿，我们班的人都在天网……不，都在你这儿玩……'),
                  { choice: [
                    { t: '“回家写作业去，成年了再来。”', do: (g) => { g.flag('refusedPang', true); g.rep(2); g.cancelCheckin(); scheduleZhang(g); }, then: [L('xiaopang', '哼，小气鬼！'), L('sys', '小胖悻悻地背着书包走了。')] },
                    { t: '“……就三个钟，别跟别人说。”', do: (g) => { g.flag('letPangIn', true); g.forceCheckin(); scheduleZhang(g); } },
                  ] },
                ] },
                { t: '“行，开卡，三块一个钟。”', do: (g) => { g.flag('letPangIn', true); g.forceCheckin(); scheduleZhang(g); } },
              ],
            },
          ],
        }),
      },
      { at: 20.6, do: (g) => { if (!g.flags.zhangScheduled) { g.flag('zhangScheduled', true); g.spawnVisitor('zhangayi', { onTalk: ZHANG_TALK }); } } },
    ],
    outro: uncleCall(3),
  },
  // ================= 第四天 =================
  {
    date: '2006年12月21日 星期四', weather: '阴 -4℃', title: '第四天 · 对门开业',
    intro: [
      L('sys', '噼里啪啦——一大早，对面响起了震天的鞭炮声。'),
      L('sys', '“天网电竞馆”的霓虹招牌亮了。门口两排花篮，扩音器喊着：“全场液晶！开业三天上网五折！”'),
      L('me', '……来者不善啊。'),
      { do: (g) => g.setRival(true) },
      L('sys', '【提示】对手开业，客流会减少。可以考虑在夜间升级设备、调整价格来竞争。'),
    ],
    events: [
      { if: null, at: 9.5, do: (g) => { if (g.flags.zhangThanks) g.sayLater([L('zhangayi', '小林！饺子！趁热吃！'), L('sys', '张阿姨塞给你一饭盒饺子，热气腾腾。（口碑+3）'), { do: (g) => g.rep(3) }]); } },
      {
        at: 11.0, do: (g) => g.spawnVisitor('qianzong', {
          onTalk: [
            L('qianzong', '你就是刘建国的外甥？啧，这店……还用大屁股显示器呢？'),
            L('qianzong', '我开门见山。我知道你们欠赵老板房租。'),
            L('qianzong', '这样，我出两万，连店带机器我全收了。你舅也能早点脱身，多好。'),
            {
              choice: [
                { t: '“不卖。这是我舅的心血。”', do: (g) => { g.flag('refuseQian', true); g.rep(1); }, then: [L('qianzong', '有骨气。那咱们走着瞧，十天后见。')] },
                { t: '“……我考虑考虑。”', do: (g) => g.flag('consideringQian', true), then: [L('qianzong', '聪明人。名片给你，想通了打电话。')] },
              ],
            },
            L('sys', '钱总扔下一张烫金名片，掸了掸皮鞋上的雪，走了。'),
          ],
        }),
      },
      {
        at: 17.0, do: (g) => g.spawnVisitor('laowang', {
          onTalk: [
            L('laowang', '小川，跟你说个事儿……对门那个钱胖子，请我去他们那儿当战队教练，包吃包上网。'),
            { if: (g) => g.state.aff.laowang >= 2, then: [
              L('laowang', '我给回了。老子在这条街打了五年CS，建国落难的时候我跑了，那还叫人吗？'),
              L('laowang', '再说了，你小子对我不赖。'),
              { do: (g) => g.flag('laowangLoyal', true) },
            ], else: [
              L('laowang', '人家那儿……确实条件好。我去看看，别多想啊。'),
              L('sys', '老王有些不好意思地走了。（和常客搞好关系很重要）'),
            ] },
          ],
        }),
      },
    ],
    outro: uncleCall(4),
  },
  // ================= 第五天 =================
  {
    date: '2006年12月22日 星期五', weather: '晴 -2℃', title: '第五天 · 保护费',
    intro: [
      L('sys', '冬至。门口包子铺排起了长队。'),
      L('me', '今天周五，晚上人应该多。'),
    ],
    events: [
      {
        at: 14.0, do: (g) => g.spawnVisitor('heige', {
          onTalk: [
            L('heige', '哟，换人了？刘建国呢？'),
            L('heige', '规矩你舅没跟你说？这条街的店，每月给哥几个三百块“卫生费”。'),
            L('me', '（这是收保护费吧……）'),
            {
              choice: [
                { t: '“……给你。别在店里闹事。”', do: (g) => { g.money(-300, 'other', '“卫生费”'); g.flag('paidHei', true); }, then: [L('heige', '懂事！以后有事报黑哥名号。'), L('sys', '黑哥叼着烟，晃晃悠悠地走了。')] },
                { t: '“没钱。要钱没有，要命一条。”', do: (g) => g.flag('refuseHei', true), then: [L('heige', '行，你有种。晚上我再来跟你“聊聊”。'), L('sys', '黑哥一脚踢翻了门口的垃圾桶。')] },
                { t: '（掏出诺基亚）“喂，110吗？”', do: (g) => g.flag('callPolice', true), then: [L('heige', '你……你他妈给我等着！'), L('sys', '黑哥骂骂咧咧地跑了。十几分钟后，派出所的小刘来了。')] },
              ],
            },
          ],
        }),
      },
      {
        at: 15.0, do: (g) => {
          if (g.flags.callPolice) g.spawnVisitor('police', {
            onTalk: [
              L('police', '你好，城关派出所。是你报的警？'),
              L('police', '赵黑子是吧，这人我们盯好久了。放心，你们这条街这阵子我们会加强巡逻。'),
              L('police', '另外提醒一句，最近要搞网吧专项整治，未成年人一定要拦住。'),
              { do: (g) => { g.rep(3); g.flag('heigeArrested', true); } },
            ],
          });
        },
      },
      { at: 19.0, do: (g) => g.netDown() },
      {
        at: 21.0, do: (g) => {
          if (!g.flags.refuseHei) return;
          g.spawnVisitor('heige', {
            onTalk: [
              L('heige', '小子！钱准备好了没？'),
              { if: (g) => g.flags.laowangLoyal && !!g.findNamed('laowang'), then: [
                L('laowang', '黑子。'),
                L('sys', '老王摘下耳机，慢慢站了起来。'),
                L('laowang', '你小时候偷你爸烟，是谁替你挨的揍？建国的店你也敢动？'),
                L('heige', '王……王哥？您在这儿啊……误会，误会！我这就走！'),
                L('sys', '黑哥灰溜溜地钻出了门帘。全场爆发出一阵哄笑。'),
                { do: (g) => { g.rep(4); g.aff('laowang', 1); g.flag('heigeGone', true); } },
              ], else: [
                L('heige', '不给钱是吧？'),
                L('sys', '黑哥抄起旁边的凳子，砸向了两台电脑！显示器“啪”地黑了。'),
                L('heige', '下回再不懂事，砸的就不是电脑了！'),
                { do: (g) => { g.breakPCs(2); g.rep(-6); } },
              ] },
            ],
          });
        },
      },
    ],
    outro: uncleCall(5),
  },
  // ================= 第六天 =================
  {
    date: '2006年12月23日 星期六', weather: '小雪 -7℃', title: '第六天 · 熊猫烧香',
    intro: [
      L('sys', '周六。墙上电视里的新闻主播一脸严肃：'),
      L('sys', '“近日，一种名为‘熊猫烧香’的电脑病毒在全国蔓延，大量网吧、企业电脑被感染……”'),
      L('me', '不会吧……'),
      { if: (g) => g.state.up.restore, then: [L('me', '还好装了还原精灵，重启就能还原。应该问题不大。')] },
    ],
    mods: { arrival: 1.15 },
    events: [
      {
        at: 13.0, do: (g) => {
          const n = g.infect(g.state.up.restore ? 2 : 6);
          g.sayLater([L('sys', `糟了！${n}台电脑的图标全变成了举着三根香的熊猫！`), L('sys', '【提示】点击中毒的座位进行杀毒（点掉屏幕上的熊猫）。')]);
        },
      },
      {
        at: 13.6, do: (g) => {
          if (!g.flags.bovenFriend) return;
          g.spawnVisitor('boven', {
            onTalk: [
              L('boven', '哥！哥！我听说你这儿中毒了！'),
              L('boven', '我这两天研究了熊猫烧香的原理，写了个专杀小工具，装在U盘里了！'),
              L('me', '你……你写的？'),
              L('boven', '嗯！它会改exe图标、删GHO备份，但特征码我都抓到了。给我五分钟！'),
              { do: (g) => g.cureAll() },
              L('sys', '周博文挨个插上U盘，屏幕上的熊猫一个接一个消失了。'),
              L('boven', '搞定！上次你免费让我上机，这算我报答你的！'),
              { do: (g) => { g.aff('boven', 2); g.rep(3); } },
            ],
          });
        },
      },
    ],
    outro: uncleCall(6),
  },
  // ================= 第七天 =================
  {
    date: '2006年12月24日 星期日', weather: '晴 -5℃', title: '第七天 · 平安夜突击检查',
    intro: [
      L('sys', '平安夜。小青年们流行在这天送苹果，网吧门口也挂起了彩灯。'),
      { if: (g) => g.state.aff.xiaomei >= 1, then: [
        L('xiaomei', '小川！跟你说个事儿，我表姐在文化局上班，说今天下午要来突击检查网吧！'),
        L('xiaomei', '未成年人、抽烟的、消防器材，都要查。你可得注意！'),
        L('me', '谢了小美！'),
        { do: (g) => g.flag('inspectWarned', true) },
      ], else: [
        L('sys', '电视里的滚动字幕：“我县即日起开展网吧专项整治行动”。'),
      ] },
      L('sys', '【提示】检查时如果有未成年人在场、有人抽烟、没有灭火器，都会被罚款。'),
    ],
    mods: { arrival: 1.1 },
    events: [
      { at: 14.5, do: (g) => { if (g.flags.inspectWarned) g.hint('检查组半小时后到！赶紧把抽烟的劝住，未成年人清出去！'); } },
      { at: 15.0, do: (g) => g.inspection() },
    ],
    outro: uncleCall(7),
  },
  // ================= 第八天 =================
  {
    date: '2006年12月25日 星期一', weather: '多云 -3℃', title: '第八天 · 圣诞战队赛',
    intro: [
      { if: (g) => g.flags.laowangLoyal, then: [
        L('laowang', '小川，钱胖子下战书了。今晚八点，五对五，CS，他天网战队对咱极速。'),
        L('laowang', '赢了，他公开认怂，那些被他五折骗走的客人就都回来了。'),
      ], else: [
        L('laowang', '小川……我回来了。天网那边，钱胖子只把人当招牌，比赛输了就扣钱，没劲。'),
        L('laowang', '他今晚要跟咱打一场战队赛，想让咱当众出丑。这口气，我替建国争！'),
        { do: (g) => g.aff('laowang', 1) },
      ] },
      L('laowang', '他说要赌，每边押一千块。你怎么说？'),
      {
        choice: [
          { t: '“赌了！输人不输阵！”', do: (g) => g.flag('bet', 1000), then: [L('laowang', '好！我这就去叫兄弟们！')] },
          { t: '“不赌钱，咱们只为荣誉而战。”', do: (g) => g.flag('bet', 0), then: [L('laowang', '也行，稳当。')] },
        ],
      },
      L('sys', '【提示】比赛在20:00开始，需要5台空闲的电脑。设备越好，赢面越大。'),
    ],
    mods: { arrival: 1.0, eveningBoost: 1.6 },
    events: [
      { at: 19.6, do: (g) => g.hint('战队赛快开始了，比赛期间会有很多观众来！') },
      { at: 20.0, do: (g) => g.tournament() },
    ],
    outro: uncleCall(8),
  },
  // ================= 第九天 =================
  {
    date: '2006年12月26日 星期二', weather: '大雪 -9℃', title: '第九天 · 停电之夜',
    intro: [
      L('sys', '一夜大雪，青石县白茫茫一片。'),
      L('me', '明天就是交租的日子了。成败在此一举。'),
    ],
    events: [
      {
        at: 11.0, do: (g) => {
          if (!g.flags.bovenFriend) return;
          g.spawnVisitor('boven', {
            onTalk: [
              L('boven', '哥……我想问你个事儿。'),
              L('boven', '那个……天天来跳舞的小美姐，你觉得……她会喜欢我这种书呆子吗？'),
              L('me', '（我就说这小子最近老往劲舞区瞟。）'),
              L('boven', '我想在QQ上跟她表白，你帮我出出主意？'),
              {
                choice: [
                  { t: '“真诚点，直接说。喜欢就是喜欢。”', do: (g) => g.flag('confess', 'honest'), then: [L('boven', '直接说……好！我试试！')] },
                  { t: '“写首藏头诗，文化人就得浪漫。”', do: (g) => g.flag('confess', 'poem'), then: [L('boven', '“小桥流水”……“美人如玉”……我想想！')] },
                  { t: '“先考上大学，到时候再说也不迟。”', do: (g) => g.flag('confess', 'wait'), then: [L('boven', '……也对。我得先对得起自己。')] },
                ],
              },
            ],
          });
        },
      },
      { at: 20.5, do: (g) => g.blackout() },
    ],
    outro: uncleCall(9),
  },
  // ================= 第十天 =================
  {
    date: '2006年12月27日 星期三', weather: '晴 -6℃', title: '第十天 · 交租日',
    intro: [
      L('sys', '十天，一晃就过去了。'),
      L('me', '今晚房东就来收租。目标：{target}块。'),
      { if: (g) => g.state.money >= g.target, then: [L('me', '钱已经够了。最后一天，站好最后一班岗。')], else: [L('me', '还差{gapNow}块……拼了！')] },
    ],
    events: [
      {
        at: 12.0, do: (g) => g.spawnVisitor('qianzong', {
          onTalk: [
            L('qianzong', '小林老弟，最后一天了。'),
            { if: (g) => g.flags.tournamentWon, then: [L('qianzong', '那天比赛……算你们狠。我钱多多服气。')] },
            L('qianzong', '我的报价还有效。两万，你点个头就行。'),
            L('me', '晚上见分晓吧。'),
          ],
        }),
      },
    ],
    outro: [],
    finale: true,
  },
];

// 结局判定
export function finaleScript(g) {
  const paid = g.state.money >= g.target;
  const lines = [
    L('sys', '晚上十点，门帘一掀，房东赵老板裹着军大衣走了进来。'),
    L('zhaolaoban', '小林啊，今天27号了。三个月房租，{target}块，准备好了吧？'),
  ];
  if (paid) {
    lines.push(
      L('me', '赵叔，您点点。'),
      L('sys', '你把一沓用皮筋扎好的钞票推到了柜台上。'),
      L('zhaolaoban', '……嘿！行啊小子！建国有你这个外甥，有福气！'),
      L('zhaolaoban', '对门那姓钱的天天找我要这铺面，我早烦他了。这店，继续租给你们！'),
      { do: (g) => g.money(-g.target, 'other', '房租') },
      L('sys', '门帘再次被掀开。'),
      L('uncle', '小川！'),
      L('me', '舅？！你怎么回来了？'),
      L('uncle', '你舅妈出院了，我连夜坐大巴赶回来的。我都听老孙说了……好小子，好小子！'),
    );
  } else {
    lines.push(
      L('me', '赵叔……还差一点……'),
      L('zhaolaoban', '差多少？{gapNow}？小林啊，不是叔不讲情面，人家钱总可是把定金都拍我桌上了……'),
      L('sys', '这时，钱总推门而入。'),
      L('qianzong', '小林，最后的机会。两万，这店卖给我，你舅的债也能还上。'),
      {
        choice: [
          { t: '“……卖吧。”', do: (g) => g.flag('ending', 'sold') },
          { t: '“不卖！哪怕关门，也不卖给你！”', do: (g) => g.flag('ending', 'closed') },
        ],
      },
    );
  }
  return lines;
}

export function endingInfo(g) {
  const s = g.state, f = g.flags;
  const paid = !!f.paidRent;
  let key, title, desc;
  if (paid && s.rep >= 75 && f.tournamentWon) {
    key = 'legend'; title = '结局 · 网吧传奇';
    desc = '“极速网吧”守住了，还成了青石县最火的网吧。舅舅把店交给了你，自己当起了甩手掌柜。三年后，你开了第二家分店，名字叫“小川网咖”。';
  } else if (paid) {
    key = 'kept'; title = '结局 · 守住了';
    desc = '房租交上了，店保住了。日子还是一样平凡：开卡、泡面、修电脑。但每个深夜，看着满屋子亮着的屏幕，你觉得这就是青春的样子。';
  } else if (f.ending === 'sold') {
    key = 'sold'; title = '结局 · 招牌换了';
    desc = '第二天，“极速网吧”的招牌被摘下，换成了“天网电竞馆二号店”。你拿着钱还清了舅舅的债，然后背起行囊去了南方。很多年后，你偶尔还会梦见那道棉门帘。';
  } else {
    key = 'closed'; title = '结局 · 熄灯';
    desc = '卷帘门最后一次拉下。老王拍拍你的肩：“没事，哥们儿去哪都跟着你。”你没有卖掉它，只是把那块旧招牌，偷偷搬回了家。';
  }
  const epi = [];
  epi.push(s.aff.laowang >= 3 ? '老王：后来成了县里第一支CS战队的教练，带出的徒弟进了全国赛。' : '老王：依然每天来打CS，只是枪法一年不如一年了。');
  if (f.confess === 'honest') epi.push('周博文 & 小美：表白成功了。第二年博文考上了大学，小美每周坐四个小时大巴去看他。');
  else if (f.confess === 'poem') epi.push('周博文 & 小美：藏头诗被小美念成了“小美是猪”。两人吵吵闹闹，最后还是在一起了。');
  else if (f.confess === 'wait') epi.push('周博文：考上了北京的计算机系。毕业那天，他给你发了条短信：“哥，那三个钟，我记一辈子。”');
  else if (f.bovenFriend) epi.push('周博文：后来成了一名程序员，写的第一个软件就叫“网管助手”。');
  else epi.push('周博文：再也没来过。你偶尔会想，那个想学编程的少年后来怎么样了。');
  epi.push(f.refusedPang ? '小胖：期末考了班级第五。他妈妈逢人就说：“极速网吧那个小网管，是个好人。”' : (f.letPangIn ? '小胖：期末考砸了，被他妈锁在家一个寒假。' : '小胖：后来考上了县一中，成了你店里最守规矩的成年客人。'));
  if (f.heigeGone || f.heigeArrested) epi.push('黑哥：被抓进去蹲了半年，出来后在菜市场帮张阿姨卖菜。');
  if (f.tournamentWon) epi.push('“极速战队”：那场圣诞夜之战成了青石县网吧圈的传说。');
  return { key, title, desc, epi };
}
