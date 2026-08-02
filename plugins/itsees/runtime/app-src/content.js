import { souvenirLibrary } from "./souvenirLibrary.js?v=souvenir-library-v3";

export const FULL_TRAVEL_MINUTES = 240;
export const DEFAULT_THEME_SPOT_COUNT = 12;
export const MAP_SEGMENT_MINUTES = FULL_TRAVEL_MINUTES / DEFAULT_THEME_SPOT_COUNT;

const sceneGroups = {
  T01: [
    ["T01-S01", "灯塔台阶", "白色灯塔旁的窄台阶，海浪在远处拍岸。", "桌宠坐在台阶上，看灯塔影子慢慢变长。"],
    ["T01-S02", "贝壳邮局", "蓝白小邮局，窗台堆着贝壳和邮戳。", "它认真挑了一枚贝壳形状的邮戳。"],
    ["T01-S03", "海鸥码头", "木码头伸向海面，海鸥停在栏杆上。", "它和海鸥互相看了一会儿，谁也没有先走。"],
    ["T01-S04", "潮汐石滩", "退潮后的石滩露出水洼和小螺壳。", "它在水洼里看见一小块被云遮住的天空。"],
    ["T01-S05", "白墙小巷", "白墙、蓝门、晾晒的布和转角处的阳光。", "它走过一条很窄的巷子，风里有海盐味。"],
    ["T01-S06", "渔船清晨", "小渔船靠岸，晨光落在网和木桨上。", "它起得很早，听见船绳轻轻碰着木桩。"],
    ["T01-S07", "海盐冰淇淋店", "小店门口挂着手写招牌，柜台有蓝色冰淇淋。", "它尝了一口很像海风的甜味。"],
    ["T01-S08", "风车坡道", "通向海边的坡道，路边有小风车和矮草。", "它把风车插在包上，一路听它转呀转。"],
    ["T01-S09", "黄昏防波堤", "防波堤边有橘色落日和钓鱼人的背影。", "它坐到天快黑，才想起来该回家。"],
    ["T01-S10", "月光海面", "夜晚海面泛银光，远处有小船灯。", "它说月亮落在海上时，看起来像一封没拆的信。"],
    ["T01-S11", "星灯栈道", "海边木栈道亮着小星灯，潮声在脚下起伏。", "它沿着灯光走到海风最软的地方。"],
    ["T01-S12", "返航白帆", "清晨白帆从远处返航，灯塔把第一束光落在海面。", "它把海面上最亮的一小片早晨带回家。"]
  ],
  T02: [
    ["T02-S01", "雾中月台", "山雾漫过木质月台，站牌若隐若现。", "它等车时，雾先替火车到了。"],
    ["T02-S02", "木牌候车室", "暖色灯、旧长椅、墙上的时刻表。", "它在候车室坐了一会儿，把便当抱得很紧。"],
    ["T02-S03", "溪谷铁桥", "铁桥跨过溪谷，桥下水声细小。", "火车还没来，它先听见了溪水。"],
    ["T02-S04", "野花站牌", "站牌旁长着野花，远山被阳光照亮。", "它给站牌旁的小花让了让路。"],
    ["T02-S05", "隧道口风声", "黑色隧道口吹来凉风，轨道延伸进去。", "它站在隧道外，听见风把远方提前送来。"],
    ["T02-S06", "山顶便当铺", "小小便当铺，蒸汽从木窗里冒出来。", "它买到一份还热着的山菜饭。"],
    ["T02-S07", "旧票根墙", "墙上贴满褪色票根和旅人留言。", "它把票根夹进包里，像夹住一段路。"],
    ["T02-S08", "雨棚滴水", "细雨落在铁皮雨棚，水珠一滴滴滑下。", "它数了很久滴水，差点错过车声。"],
    ["T02-S09", "夕阳轨道", "夕阳顺着轨道铺开，车站空空的。", "它说铁轨在傍晚会变成一条金线。"],
    ["T02-S10", "清晨第一班车", "清晨蓝光里，第一班小火车亮着灯驶来。", "它背好包，和第一班车一起出发。"],
    ["T02-S11", "云外信号灯", "山腰信号灯在云雾外亮起，铁轨钻进淡金色晨光。", "它看见一盏灯替远山眨了眨眼。"],
    ["T02-S12", "终点小站", "终点站只有一块木牌和几盆野花，远处群山安静铺开。", "它在最小的小站，也收到了很大的远方。"]
  ],
  T03: [
    ["T03-S01", "霓虹水洼", "夜晚霓虹倒映在水洼里，街边刚下过雨。", "它低头看见一座倒过来的城市。"],
    ["T03-S02", "咖啡窗边", "咖啡店窗上有雨痕，室内灯光温暖。", "它在窗边坐着，看行人把伞一把把收起来。"],
    ["T03-S03", "雨伞巷口", "巷口挂着几把晾干的伞，墙面泛着湿光。", "它躲在伞影下面，等一阵小风过去。"],
    ["T03-S04", "地铁出口", "地铁口冒出人流，台阶边有反光积水。", "它站在出口边，听见城市从地下醒来。"],
    ["T03-S05", "便利店暖光", "雨夜便利店亮着白黄灯，玻璃门上有水珠。", "它买了一瓶热饮，握在爪子里暖了很久。"],
    ["T03-S06", "屋顶积水", "楼顶有小水洼，天线和云倒映其中。", "它在屋顶发现一小片安静的天空。"],
    ["T03-S07", "玻璃天桥", "透明天桥横跨街道，车灯从脚下流过。", "它走在半空中，看见车灯像河一样。"],
    ["T03-S08", "夜班巴士", "空巴士停在站边，车窗上映着路灯。", "它坐上最后一排，跟城市一起慢慢摇晃。"],
    ["T03-S09", "旧书店门口", "旧书店门外有防雨棚和手写折扣牌。", "它翻到一张旧地图，像翻到别人走过的梦。"],
    ["T03-S10", "清晨清扫车", "清晨街道湿亮，清扫车慢慢开过。", "它看见城市把昨晚的雨收拾好。"],
    ["T03-S11", "雨窗旧店", "雨夜旧店的玻璃窗亮着暖光，门口积水映着招牌。", "它在窗边躲了一会儿雨，把暖光也装进口袋。"],
    ["T03-S12", "清晨水街", "雨后的清晨街道像浅浅河面，路灯和长椅倒映其中。", "它沿着倒影走，好像从城市的另一面回来。"]
  ],
  T04: [
    ["T04-S01", "苔藓石阶", "被苔藓覆盖的石阶通向树林深处。", "它一步一步走得很轻，怕把苔藓吵醒。"],
    ["T04-S02", "树洞信箱", "老树洞里放着几封小信和叶子邮票。", "它发现树洞里也有人寄信。"],
    ["T04-S03", "蘑菇圆环", "小蘑菇围成圆圈，阳光从枝叶间漏下。", "它没有踩进去，只在旁边认真观察。"],
    ["T04-S04", "溪边木桥", "窄木桥跨过浅溪，水面漂着叶子。", "它在桥上停住，看一片叶子慢慢远行。"],
    ["T04-S05", "落叶帐篷", "落叶堆成小棚子，里面有温暖的光。", "它临时躲进落叶里，听风从外面跑过。"],
    ["T04-S06", "松果坡道", "满地松果的小坡，远处有树影。", "它捡了最圆的一颗松果，说像一枚小地球。"],
    ["T04-S07", "萤火小径", "夜色森林里，萤火虫沿小路闪烁。", "它跟着一点一点的光走，像跟着会飞的路标。"],
    ["T04-S08", "鸟巢观察点", "低矮树枝间有鸟巢，旁边有小望远镜。", "它看见一根羽毛轻轻落下来。"],
    ["T04-S09", "树冠光斑", "午后阳光穿过树冠，在地上形成斑点。", "它坐在光斑里，好像坐在一张会移动的毯子上。"],
    ["T04-S10", "雨后泥土路", "森林雨后，泥土湿润，小脚印留在路上。", "它留下了一串脚印，又被雨味慢慢盖住。"],
    ["T04-S11", "树影营地", "树根旁有小小营地，叶影和暖灯一起落在苔藓上。", "它在树影里坐下，听见夜晚慢慢变轻。"],
    ["T04-S12", "晨露出口", "森林出口铺着晨露，远处阳光穿过低矮枝叶。", "它回头看见来时的小路正在发光。"]
  ],
  T05: [
    ["T05-S01", "蓝布帐篷", "蓝色帐篷在风里鼓起，阴影里摆着小毯子。", "它在帐篷下坐了一会儿，风把布吹得像海。"],
    ["T05-S02", "铜壶茶摊", "铜壶、玻璃杯、热茶香气和低矮桌子。", "它喝到一杯很烫的茶，香味留在包里。"],
    ["T05-S03", "香料小巷", "彩色香料堆成小山，巷子窄而明亮。", "它打了个喷嚏，差点把路线忘掉。"],
    ["T05-S04", "骆铃沙丘", "沙丘上有驼铃声，远处线条起伏。", "它听见铃声从很远的地方慢慢靠近。"],
    ["T05-S05", "夜晚星盘", "沙漠夜空低垂，地上摊着星盘和地图。", "它第一次觉得星星也能指路。"],
    ["T05-S06", "风蚀石门", "形状奇特的石门立在沙地边缘。", "它从石门下走过，风把影子拉得很长。"],
    ["T05-S07", "绿洲水井", "绿洲边有水井、棕榈影和小小水面。", "它听见井水很深，像藏着另一个晚上。"],
    ["T05-S08", "红毯摊位", "红色地毯铺在沙地上，摆着小饰品。", "它挑了很久，最后只带走一粒亮亮的珠子。"],
    ["T05-S09", "日落驿站", "低矮驿站前，落日把墙染成橙色。", "它在驿站门口拍掉鞋边的沙。"],
    ["T05-S10", "月下沙纹", "月光照着一层层沙纹，四周很安静。", "它说夜里的沙漠像一本没有字的书。"],
    ["T05-S11", "晨光商队", "清晨商队沿着沙丘边缘前行，驼铃和日光一起晃动。", "它把第一声驼铃记成今天的开头。"],
    ["T05-S12", "星沙归路", "夜色里细沙像碎星，远处集市的灯一点点变小。", "它沿着会发亮的沙纹找到了回家的方向。"]
  ],
  T06: [
    ["T06-S01", "雪灯小路", "一排雪灯沿小路亮起，雪花缓慢落下。", "它沿着雪灯走，像走在一串小小的星星旁边。"],
    ["T06-S02", "木桶温泉", "木桶边冒着热气，旁边放着小毛巾。", "它把爪子伸进热气里，整只都安静下来。"],
    ["T06-S03", "围巾长椅", "长椅上落着雪，旁边有一条红围巾。", "它坐在长椅上，把围巾绕了两圈。"],
    ["T06-S04", "暖帘旅馆", "旅馆门口挂着暖帘，窗内透出黄光。", "它掀开暖帘时，雪被挡在了外面。"],
    ["T06-S05", "雪人邮筒", "小雪人站在红邮筒旁，头上戴着叶子帽。", "它和雪人一起守了一会儿信。"],
    ["T06-S06", "结冰湖面", "湖面结冰，边缘有蓝色裂纹和雪影。", "它在湖边看见云被冻得很安静。"],
    ["T06-S07", "炉火休息室", "木屋里有炉火、软垫和半开的旅行包。", "它把湿掉的手套放在炉火旁烤。"],
    ["T06-S08", "雪中鸟居", "白雪覆盖鸟居，路尽头有微弱灯光。", "它从鸟居下走过，脚步声被雪收走了。"],
    ["T06-S09", "清晨扫雪", "清晨旅馆前有人扫雪，天空是淡蓝色。", "它醒得很早，看见新的一天被一点点扫出来。"],
    ["T06-S10", "夜晚热气", "夜晚温泉热气升起，远处山影模糊。", "它说热气会把星星也熏得软软的。"],
    ["T06-S11", "雪窗早餐", "积雪窗边摆着热汤和小饭团，屋外雪光安静。", "它把早餐的热气写进明信片角落。"],
    ["T06-S12", "融雪归桥", "小桥边雪开始融化，水声从冰下轻轻露出来。", "它听见春天在很远的地方敲了敲门。"]
  ],
  T07: [
    ["T07-S01", "睡莲池边", "睡莲浮在水面，蜻蜓停在花苞上。", "它在池边等一朵花慢慢打开。"],
    ["T07-S02", "小船栈桥", "小木船系在栈桥边，绳子轻轻晃动。", "它没有上船，只把脚尖伸到水影里。"],
    ["T07-S03", "黄昏长椅", "长椅面向湖面，黄昏把水染成金色。", "它坐到风变凉，才把明信片写完。"],
    ["T07-S04", "白花拱门", "白色花藤拱门下有碎石小路。", "它从花下经过，包上沾了一点香味。"],
    ["T07-S05", "喷水池", "旧喷水池溅起细小水珠，旁边有硬币光。", "它听见水声一遍遍重复，像很轻的歌。"],
    ["T07-S06", "旧温室", "玻璃温室里有热带植物和朦胧水汽。", "它在温室里看见叶子比自己还高。"],
    ["T07-S07", "湖边野餐布", "格子野餐布铺在草地上，旁边有水果篮。", "它认真分了一半阳光给便当。"],
    ["T07-S08", "柳树倒影", "柳枝垂到湖面，倒影被风吹散。", "它伸手去碰倒影，结果只碰到一圈涟漪。"],
    ["T07-S09", "晨雾步道", "清晨雾气漂在湖边步道，路灯还没熄。", "它走在雾里，像走在一张没画完的地图上。"],
    ["T07-S10", "月下船灯", "夜晚湖面有一盏小船灯，周围安静。", "它说那盏灯像湖心寄来的晚安。"],
    ["T07-S11", "雾湖花岸", "湖岸起了薄雾，花丛和灯影都变得柔软。", "它站在雾里，看见湖水把声音收得很轻。"],
    ["T07-S12", "湖心晨光", "清晨湖心泛起金色波纹，小船影子慢慢靠岸。", "它把湖面最早的一圈光收进相册。"]
  ],
  T08: [
    ["T08-S01", "青石桥", "青石桥跨过小河，桥面被雨水磨亮。", "它在桥上停了一下，看水把云带走。"],
    ["T08-S02", "灯笼茶馆", "茶馆门口挂着红灯笼，木桌上有热茶。", "它坐在靠窗的位置，听见茶盏轻轻碰响。"],
    ["T08-S03", "纸伞铺", "纸伞一把把撑开，颜色像小小屋顶。", "它挑了一把伞，打开后像带着一片天。"],
    ["T08-S04", "河边码头", "小船靠在河边，绳结和木桩沾着水汽。", "它看船夫把一篙水声推远。"],
    ["T08-S05", "木窗花影", "老木窗透出花影，窗边挂着风铃。", "它从窗下经过，影子落在包上。"],
    ["T08-S06", "糖画小摊", "糖画摊前有小铜勺和亮晶晶的糖线。", "它看糖线变成一只小鸟，舍不得吃。"],
    ["T08-S07", "雨巷青瓦", "细雨落在青瓦上，巷子深处有灯。", "它听了一路瓦上的雨，觉得脚步也变慢了。"],
    ["T08-S08", "戏台后台", "戏台后有彩色衣箱、鼓槌和半卷帘子。", "它躲在后台边，看见一段故事正要开始。"],
    ["T08-S09", "石阶猫影", "石阶转角有一小团影子，夕阳斜照。", "它和转角的影子互相让路。"],
    ["T08-S10", "夜市尽头", "夜市灯火渐少，最后一家摊还亮着。", "它走到长街尽头，带回一点热闹的余温。"],
    ["T08-S11", "石阶晨光", "青石阶旁的白墙被晨光照亮，树影一点点落下来。", "它沿着石阶往上走，像走进一封很旧的信。"],
    ["T08-S12", "桥头月灯", "石桥头挂着一盏月色灯笼，河水映着青瓦和星点。", "它走过桥时，把一小段月光留在鞋边。"]
  ],
  T09: [
    ["T09-S01", "恐龙骨架厅", "巨大的恐龙骨架下，桌宠显得很小。", "它仰头看了很久，脖子都有点累。"],
    ["T09-S02", "古地图展柜", "展柜里摊着古地图，边角微微泛黄。", "它发现以前的远方，也被人认真画下来过。"],
    ["T09-S03", "纪念章台", "桌面上摆着印章和空白卡片。", "它把章盖得很用力，像给今天按下一个记号。"],
    ["T09-S04", "安静长椅", "展厅角落的长椅，灯光柔和，人影很少。", "它坐在长椅上，把脚步声都收小了。"],
    ["T09-S05", "玻璃穹顶", "高高的玻璃穹顶透下自然光。", "它抬头看见天空被分成一格一格。"],
    ["T09-S06", "文创商店", "小货架上摆着贴纸、书签和明信片。", "它在商店里犹豫很久，什么都想带回家。"],
    ["T09-S07", "讲解耳机", "一副小耳机放在导览台旁。", "它戴上耳机，听见很久以前的声音。"],
    ["T09-S08", "临展海报", "临展海报贴在入口，颜色鲜明。", "它在海报前站定，像被一扇新门叫住。"],
    ["T09-S09", "楼梯转角", "楼梯转角有窗光和指示牌。", "它在转角处迷路了一小会儿，发现也不错。"],
    ["T09-S10", "闭馆前大厅", "闭馆广播响起，大厅灯光慢慢变暗。", "它最后回头看了一眼，好像和一天告别。"],
    ["T09-S11", "晨光楼梯", "展馆楼梯被晨光照亮，扶手和墙面安静得像刚醒。", "它在楼梯转角停了一下，听见光落下来的声音。"],
    ["T09-S12", "晨光中庭", "中庭玻璃顶洒下晨光，展厅门牌一块块亮起来。", "它在安静的早晨，把今天盖成新的纪念章。"]
  ],
  T10: [
    ["T10-S01", "篝火旁边", "篝火、折叠椅、被火光照亮的小包。", "它坐在火边，把一天的风都烤暖了。"],
    ["T10-S02", "望远镜草坡", "草坡上架着望远镜，远处山线很低。", "它从望远镜里看见一颗慢慢移动的光点。"],
    ["T10-S03", "帐篷灯影", "帐篷里亮着小灯，影子映在布面上。", "它钻进帐篷前，把鞋上的草屑拍掉。"],
    ["T10-S04", "银河山脊", "山脊上方铺开银河，天空很深。", "它说原来夜空也有一条可以走的路。"],
    ["T10-S05", "热可可杯", "杯子冒着热气，旁边放着小饼干。", "它捧着热可可，等星星慢慢多起来。"],
    ["T10-S06", "露营桌地图", "露营桌上摊着地图、指南针和手电。", "它用手电照着地图，认真圈出明天的方向。"],
    ["T10-S07", "流星瞬间", "一颗流星划过夜空，桌宠抬头。", "它还没来得及许愿，流星已经替它跑远了。"],
    ["T10-S08", "夜风旗帜", "小旗帜在夜风里轻轻摆动。", "它听见旗帜发出很小的声音，像在说晚安。"],
    ["T10-S09", "清晨露珠", "清晨草叶上有露珠，帐篷外天色变浅。", "它醒来时，世界像刚被擦亮。"],
    ["T10-S10", "回程背包", "背包放在石头旁，里面露出明信片角。", "它把最后一颗星星收进背包，然后回家。"],
    ["T10-S11", "山顶日出", "山顶帐篷边升起第一道日光，草叶和绳结都亮了。", "它看见太阳从睡袋外面轻轻探头。"],
    ["T10-S12", "星尘归途", "回程小路上还留着夜色，背包边沾着一点星光。", "它说有些星星会跟着人走到家门口。"]
  ],
  T11: [
    ["T11-S01", "玻璃潜艇窗", "圆形舷窗外有蓝色海光和慢慢经过的小鱼。", "它贴着玻璃看了很久，像在看另一种天空。"],
    ["T11-S02", "珊瑚拱门", "粉橙色珊瑚形成小拱门，水流带着细沙闪光。", "它从拱门下经过，背包边缘沾了一点海蓝。"],
    ["T11-S03", "海草邮路", "高高的海草像绿色信道，贝壳邮包挂在路标旁。", "它沿着海草之间的小路，把一封信送给远处。"],
    ["T11-S04", "珍珠洞室", "贝壳和珍珠在幽暗洞室里发出柔光。", "它轻轻数珍珠，怕声音把水波弄乱。"],
    ["T11-S05", "发光水母湾", "透明水母在深蓝水湾里像小灯一样漂浮。", "它跟着一盏会游泳的光，慢慢忘了时间。"],
    ["T11-S06", "沉船甲板", "旧木船半埋在沙中，甲板上长出小珊瑚。", "它在旧船边捡到一枚没有目的地的扣子。"],
    ["T11-S07", "贝壳剧场", "扇贝形舞台旁有海星座位和柔软水纹。", "它坐在最后一排，听见海浪替大家鼓掌。"],
    ["T11-S08", "海龟缓坡", "海龟经过缓缓上升的沙坡，远处有蓝色光柱。", "它给慢慢经过的海龟让出整条路。"],
    ["T11-S09", "深蓝灯塔", "海底灯塔在暗蓝水域里发出温柔光束。", "它发现海底也有给迷路者看的灯。"],
    ["T11-S10", "气泡回程梯", "一串气泡向海面升起，像透明的回家楼梯。", "它踩着气泡的影子，准备把海底带回相册。"],
    ["T11-S11", "潮光灯塔", "海底灯塔穿过深蓝潮水照亮珊瑚，鱼群从光里慢慢游过。", "它发现给海底指路的灯，也会把远方照得很近。"],
    ["T11-S12", "海面晨光", "海面上方透来晨光，气泡像透明台阶一样往上升。", "它跟着光往上游，听见远处像是在说早安。"]
  ],
  T12: [
    ["T12-S01", "苹果木门", "果园入口有旧木门，枝头压着红苹果。", "它推开门时，闻见一整个下午的甜味。"],
    ["T12-S02", "蜂箱花田", "蜂箱旁开满小花，阳光在花粉里发亮。", "它在花田边站好，让忙碌的嗡嗡声先过去。"],
    ["T12-S03", "谷仓午睡", "红谷仓里堆着干草，窗缝落下一束光。", "它把背包当枕头，睡了一个很轻的午觉。"],
    ["T12-S04", "奶酪地窖", "石头地窖里摆着圆奶酪和小木架。", "它小心闻了闻，把香味记进明信片。"],
    ["T12-S05", "风铃菜园", "菜园上方挂着玻璃风铃，叶子被风吹亮。", "它听风铃响了三下，才想起要继续走。"],
    ["T12-S06", "烘焙小屋", "小屋窗边有刚出炉的面包和麦穗花束。", "它把热面包抱在怀里，像抱住一小团太阳。"],
    ["T12-S07", "稻草迷宫", "低矮稻草墙围出小迷宫，尽头有彩旗。", "它在迷宫里绕了一圈，出来时多带了一根稻草。"],
    ["T12-S08", "小溪洗篮", "浅溪旁放着藤篮，水面漂着几片果叶。", "它把篮子洗得很认真，连倒影也变干净了。"],
    ["T12-S09", "黄昏牧栏", "牧栏在金色黄昏里延伸，草地泛着暖光。", "它趴在栏杆上，看太阳慢慢落进草里。"],
    ["T12-S10", "清晨露台", "农舍露台上有早餐盘、露珠和远处晨雾。", "它醒来时，杯子边缘还挂着一小颗露水。"],
    ["T12-S11", "果园晚霞", "果园门口被晚霞染成蜂蜜色，苹果树影落在木栅栏上。", "它站在门边，看见一天慢慢变甜。"],
    ["T12-S12", "苹果派露台", "露台桌上放着苹果派和热茶，果园风从台阶旁吹来。", "它等派凉一点，却先被香味抱住了。"]
  ],
  T13: [
    ["T13-S01", "浮云登机桥", "柔软云桥连接着小小空港和远处云岛。", "它踩上云桥时，脚步声变得很轻。"],
    ["T13-S02", "飞艇泊位", "暖色飞艇停在木质泊位，绳索在风里轻晃。", "它给飞艇的影子让路，等风把绳索吹安静。"],
    ["T13-S03", "气象球棚", "半透明气象球挂在棚下，映着蓝天和云。", "它看见天气被装进圆圆的球里。"],
    ["T13-S04", "云海候风台", "候风台伸向云海，栏杆上挂着小旗。", "它等风来的时候，云先从脚边经过。"],
    ["T13-S05", "风向标塔", "细高塔顶的风向标慢慢转动，远处云层发光。", "它把风向记在心里，像记住一条看不见的路。"],
    ["T13-S06", "行李滑索", "小行李沿滑索穿过两座云岛之间。", "它看着包裹飞过去，忍不住跟着挥手。"],
    ["T13-S07", "晴雨修理铺", "修理铺里挂着晴天伞和雨滴瓶，窗外有彩云。", "它修好一把小伞，伞面上还留着晴光。"],
    ["T13-S08", "星图航线室", "圆窗航线室里铺着星图和罗盘，没有文字标记。", "它用手电照亮一条通往夜里的线。"],
    ["T13-S09", "彩虹加油站", "彩虹旁有给飞艇补光的小站，云层被染成淡色。", "它接了一小瓶彩虹色的风。"],
    ["T13-S10", "日落返航灯", "空港边的返航灯在橘色云海里一盏盏亮起。", "它沿着灯光回头，看见来路都变成金色。"],
    ["T13-S11", "云岛灯塔", "云岛边有小小灯塔，灯光穿过薄云给飞艇指路。", "它第一次知道云上也会有人等灯。"],
    ["T13-S12", "晨航归港", "清晨空港被淡蓝色包围，飞艇慢慢停回木质泊位。", "它把云层里的第一阵风装进口袋。"]
  ],
  T14: [
    ["T14-S01", "黑沙海岸", "黑色细沙贴着海浪，远处火山云缓慢升起。", "它在黑沙上留下脚印，像写下一串小省略号。"],
    ["T14-S02", "熔岩观景台", "安全石台望向缓慢发亮的熔岩河。", "它站在热风边缘，觉得远方正在呼吸。"],
    ["T14-S03", "蒸汽温泉谷", "地热谷里有白色蒸汽和红褐色石头。", "它看蒸汽一团团升起，像岛在写信。"],
    ["T14-S04", "玄武岩桥", "六边形玄武岩铺成小桥，桥下有暗红光。", "它数着石柱过桥，数到一半就忘了热。"],
    ["T14-S05", "硫黄花坡", "黄色小花长在温热坡地上，空气微微发亮。", "它发现最热的地方，也会开出很小的花。"],
    ["T14-S06", "火山玻璃摊", "摊位摆着黑曜石和透明火山玻璃碎片。", "它挑了一块很亮的石头，像挑到一小片夜晚。"],
    ["T14-S07", "地热厨房", "石灶利用地热冒出蒸汽，锅边放着小食材。", "它等食物熟的时候，连背包都暖了起来。"],
    ["T14-S08", "熔光洞口", "洞口深处透出温暖红光，石壁有闪烁矿点。", "它站在洞外，听见地下很慢很慢的声音。"],
    ["T14-S09", "冷却熔岩路", "灰黑熔岩路上有细小裂纹和新生苔点。", "它沿着冷却后的路走，像走过一段刚安静下来的故事。"],
    ["T14-S10", "星夜火山口", "夜空下火山口泛着微光，星星挂在热气上方。", "它把最后一点红光收进眼睛里，准备回家。"],
    ["T14-S11", "熔岩坡灯", "黑石坡上点着几盏小灯，冷却熔岩缝里还藏着橙红色微光。", "它沿着热过的路走，鞋底也像记住了火。"],
    ["T14-S12", "冷星火口", "星空下火山口安静发亮，远处地平线泛着紫色夜光。", "它把一点地热暖意带进回家的夜里。"]
  ],
  T15: [
    ["T15-S01", "晶簇入口", "洞口两侧长着透明晶簇，外面的光被折成碎片。", "它弯腰走进洞口，像走进一只发光的贝壳。"],
    ["T15-S02", "地下河舟", "小舟漂在安静地下河上，水面映着晶光。", "它把手伸向水面，碰到一条摇晃的星河。"],
    ["T15-S03", "萤石阶梯", "绿色萤石沿石阶发光，台阶通向更深处。", "它一步一步往下走，鞋尖也被照成绿色。"],
    ["T15-S04", "回声大厅", "高大的洞厅里有圆形回声和远处水滴声。", "它轻轻咳了一声，洞窟把声音还给它三次。"],
    ["T15-S05", "蓝光矿脉", "蓝色矿脉穿过岩壁，像安静的河流。", "它沿着蓝光走，觉得墙壁也在带路。"],
    ["T15-S06", "石笋花园", "石笋像小花园一样排列，顶部挂着水珠。", "它在石笋间慢慢穿行，怕碰落一颗古老的水。"],
    ["T15-S07", "水镜洞室", "洞室中央有平静水池，倒映出整个晶顶。", "它在水镜边看见另一个小小的自己。"],
    ["T15-S08", "矿车小站", "旧矿车停在短轨旁，车里铺着软布和灯。", "它坐进矿车里，听轨道轻轻响了一下。"],
    ["T15-S09", "暖灯营地", "洞内小营地亮着暖灯，石壁投出柔和影子。", "它在地下也找到一盏像家的灯。"],
    ["T15-S10", "出口晨光", "洞口尽头透进清晨光线，晶体边缘泛白。", "它回头看了一眼，把洞里的蓝光留在明信片上。"],
    ["T15-S11", "晶洞夜营", "晶洞深处搭起小小夜营，暖灯照着岩壁和蓝色晶簇。", "它在地下听见一盏灯把夜晚安放好。"],
    ["T15-S12", "晨雾洞口", "洞口外有淡淡晨雾，晶簇把光折成细碎彩点。", "它从洞里走出来，像带回一包会闪的早晨。"]
  ]
};

const themeMeta = [
  ["T01", "海边小镇", "海风、灯塔、贝壳、咸味空气", ["#2f8f9d", "#f4b860", "#e96f51", "#f6efe3"], "灯塔"],
  ["T02", "山间车站", "云雾、铁轨、木站台、远山", ["#486b56", "#c9a66b", "#7e8f9a", "#f2ead7"], "站台"],
  ["T03", "雨后城市", "霓虹、水洼、咖啡店、玻璃窗", ["#315c72", "#d95d6a", "#f0b45b", "#ebe3d5"], "水洼"],
  ["T04", "森林秘径", "苔藓、树洞、鸟鸣、溪流", ["#3d7050", "#8aa65b", "#d5a64f", "#f0e9d8"], "树洞"],
  ["T05", "沙漠集市", "风沙、铜壶、帐篷、星空", ["#b56f39", "#d4a24d", "#2f5670", "#f1dfbf"], "星盘"],
  ["T06", "雪国温泉", "雪灯、木桶、热气、围巾", ["#6f91a8", "#d85d4f", "#f2c879", "#f7f3ea"], "温泉"],
  ["T07", "湖畔花园", "小船、睡莲、长椅、黄昏", ["#537f76", "#d98c7d", "#a6b866", "#f4ead8"], "小船"],
  ["T08", "古镇长街", "石桥、灯笼、茶馆、青瓦", ["#6f4d3b", "#bf4b3f", "#3f7480", "#efe1c8"], "石桥"],
  ["T09", "博物馆一日", "展柜、手账、安静脚步、纪念章", ["#5f5b8c", "#c08a3e", "#66806a", "#eee7d8"], "展柜"],
  ["T10", "星空营地", "帐篷、篝火、望远镜、银河", ["#273f68", "#d96e46", "#f0c45b", "#e9e0cf"], "银河"],
  ["T11", "珊瑚海底", "潜艇窗、珊瑚、海草、发光水母", ["#1d6f86", "#f28f7a", "#67b7a5", "#eef0dc"], "珊瑚"],
  ["T12", "果园牧场", "苹果、蜂箱、谷仓、面包香气", ["#6f8a45", "#d65f45", "#e1b35c", "#f1e7cf"], "苹果"],
  ["T13", "云端空港", "飞艇、云桥、气象球、返航灯", ["#4e83a3", "#d99c52", "#e8d184", "#eff0df"], "飞艇"],
  ["T14", "火山地热岛", "黑沙、熔岩、蒸汽、玄武岩", ["#3f3b36", "#d85c37", "#e1a752", "#ead9bd"], "火山"],
  ["T15", "水晶洞窟", "晶簇、地下河、萤石、蓝光矿脉", ["#3e627d", "#77b9c8", "#b996d8", "#e8e3d5"], "晶簇"]
];

function createMapSegments(themeId, spotCount = DEFAULT_THEME_SPOT_COUNT) {
  const minutesPerSpot = FULL_TRAVEL_MINUTES / spotCount;
  return Array.from({ length: spotCount }, (_, index) => ({
    id: `${themeId}-M${String(index + 1).padStart(2, "0")}`,
    order: index + 1,
    unlockMinute: (index + 1) * minutesPerSpot
  }));
}

export const themes = themeMeta.map(([id, name, tags, palette, motif]) => ({
  id,
  name,
  tags,
  palette,
  motif,
  assets: {
    mapColor: `./assets/themes/${id}/map-color.png`,
    mapGray: `./assets/themes/${id}/map-gray.png`
  },
  unlocked: ["T01", "T02", "T03"].includes(id),
  scenes: sceneGroups[id].map(([sceneId, sceneName, visual, message], index) => ({
    id: sceneId,
    themeId: id,
    name: sceneName,
    visual,
    message,
    imageAsset: `./assets/themes/${id}/scenes/${sceneId}.png`,
    rarity: index > 7 ? "rare" : index > 4 ? "uncommon" : "common",
    segmentOrder: index + 1
  })),
  mapSegments: createMapSegments(id)
}));

export const inventoryItems = [
  { id: "food-riceball", name: "饭团", symbol: "饭", type: "food", effect: "让普通旅途更安稳", asset: "./assets/pack/food-riceball.png", unlockAtCompletedThemes: 0 },
  { id: "food-water", name: "水壶", symbol: "水", type: "food", effect: "偏向自然与户外风景", asset: "./assets/pack/food-water.png", unlockAtCompletedThemes: 0 },
  { id: "food-sandwich", name: "三明治", symbol: "治", type: "food", effect: "偏向城市与车站风景", asset: "./assets/pack/food-sandwich.png", unlockAtCompletedThemes: 1 },
  { id: "food-tea", name: "热茶", symbol: "茶", type: "food", effect: "偏向温暖柔和的风景", asset: "./assets/pack/food-tea.png", unlockAtCompletedThemes: 3 },
  { id: "food-candy", name: "糖果", symbol: "糖", type: "food", effect: "提升珍稀机会，可能多带回一件", asset: "./assets/pack/fruit-candy.png", unlockAtCompletedThemes: 6 },
  { id: "food-bento", name: "便当", symbol: "弁", type: "food", effect: "让完整旅行的收获更稳定", asset: "./assets/pack/food-bento.png", unlockAtCompletedThemes: 10 },
  { id: "tool-camera", name: "相机", symbol: "相", type: "tool", effect: "偏向细节丰富的明信片", asset: "./assets/pack/travel-camera.png", unlockAtCompletedThemes: 0 },
  { id: "tool-umbrella", name: "雨伞", symbol: "伞", type: "tool", effect: "偏向雨天与水光风景", asset: "./assets/pack/tool-umbrella.png", unlockAtCompletedThemes: 0 },
  { id: "tool-compass", name: "指南针", symbol: "针", type: "tool", effect: "偏向路线与远行风景", asset: "./assets/pack/tool-compass.png", unlockAtCompletedThemes: 1 },
  { id: "tool-sketchbook", name: "素描本", symbol: "绘", type: "tool", effect: "偏向柔和安静的明信片", asset: "./assets/pack/tool-sketchbook.png", unlockAtCompletedThemes: 3 },
  { id: "tool-binoculars", name: "望远镜", symbol: "望", type: "tool", effect: "偏向辽阔的远景画面", asset: "./assets/pack/tool-binoculars.png", unlockAtCompletedThemes: 6 },
  { id: "tool-stampbook", name: "手账本", symbol: "记", type: "tool", effect: "提升珍稀机会，可能多带回一件", asset: "./assets/pack/travel-journal.png", unlockAtCompletedThemes: 10 }
];

export const souvenirBadgeVariants = [
  { type: "glass_bead" },
  { type: "ticket_stub" },
  { type: "stamp" },
  { type: "bookmark" },
  { type: "patch" },
  { type: "miniature" },
  { type: "token" },
  { type: "charm" },
  { type: "brooch" },
  { type: "tag" }
];

const themeSouvenirCatalog = {
  T01: [
    ["灯塔珐琅针", "Lighthouse Enamel Pin", "灯", "the lighthouse steps and salt-bright horizon"],
    ["贝壳邮局印章", "Shell Post Office Stamp", "贝", "the shell-stamped letters of a blue-and-white post office"],
    ["海鸥码头绳结", "Gull Pier Sailor’s Knot", "鸥", "the timber pier, watchful gulls, and softly knocking mooring ropes"],
    ["海盐风车胸针", "Sea-Breeze Pinwheel Brooch", "风", "the tiny pinwheels turning along a sea-salt slope"],
    ["返航白帆船牌", "Homebound Sailboat Plaque", "帆", "white sails returning through the lighthouse’s first morning beam"],
    ["潮池海星玻璃坠", "Tidepool Starfish Glass Charm", "星", "a tiny starfish resting in a clear blue tidepool"],
    ["悬崖观潮望镜", "Clifftop Sea-Watch Monocular", "崖", "the far horizon seen from a wind-brushed coastal cliff"],
    ["渔港木箱船锚扣", "Harbor Crate Anchor Clasp", "锚", "painted fish crates and small anchors along the working harbor"],
    ["落日堤岸橙光章", "Sunset Breakwater Brooch", "夕", "orange evening light settling over the stone breakwater"],
    ["晨雾灯塔透镜牌", "Dawn Lighthouse Lens Tag", "晨", "the lighthouse lens cutting a warm path through morning fog"]
  ],
  T02: [
    ["雾中月台铜哨", "Mistbound Platform Whistle", "雾", "a timber platform arriving slowly through mountain mist"],
    ["木牌候车室站牌", "Timber Waiting-Room Sign", "站", "the warm lamps, old benches, and handwritten timetable of a mountain station"],
    ["溪谷铁桥票夹", "Valley Bridge Ticket Clip", "桥", "the iron bridge carrying a quiet railway over the creek"],
    ["野花时刻签", "Wildflower Timetable Marker", "花", "a sunlit station sign bordered by mountain wildflowers"],
    ["云外信号灯徽", "Signal Beyond the Clouds Badge", "信", "the signal lamp blinking beyond the clouds at daybreak"],
    ["山窗行李铜牌", "Mountain-Window Luggage Tag", "窗", "layered ridges framed by the carriage window"],
    ["货场手推车轮扣", "Freight-Yard Trolley Wheel", "轮", "a small handcart waiting beside stacked station crates"],
    ["隧道回声黑石章", "Tunnel Echo Stone Token", "隧", "the dark tunnel mouth returning a distant whistle"],
    ["初雪站台红绳结", "First-Snow Platform Knot", "雪", "red luggage cord bright against the first snow on the platform"],
    ["日出终点钟面牌", "Sunrise Terminus Clock Tag", "钟", "the station clock catching sunrise at the end of the line"]
  ],
  T03: [
    ["霓虹雨滴吊坠", "Neon Raindrop Pendant", "霓", "neon streets reflected in a rain-darkened puddle"],
    ["咖啡窗雨纹杯垫", "Rain-Window Café Coaster", "窗", "warm café light seen through trails of rain on glass"],
    ["雨伞巷口伞扣", "Umbrella Alley Clasp", "伞", "drying umbrellas and damp walls at the mouth of a narrow alley"],
    ["夜班巴士车票夹", "Night Bus Fare Clip", "夜", "the last bus rocking gently beneath rain-polished streetlights"],
    ["清晨水街反光牌", "Morning Water-Street Plaque", "晨", "a waking city mirrored across its rain-washed streets"],
    ["报刊亭雨帽徽", "Rainy Newsstand Brooch", "报", "a striped newsstand awning shining after the shower"],
    ["天桥信号灯挂坠", "Skybridge Signal Charm", "桥", "traffic lights glowing beneath a wet pedestrian bridge"],
    ["巷尾猫影玻璃片", "Alley Cat Reflection Tile", "猫", "a cat silhouette reflected in a narrow rain puddle"],
    ["午夜便利店纸袋牌", "Midnight Corner-Shop Tag", "店", "a warm paper bag carried from a midnight corner shop"],
    ["云开屋顶银边针", "Clearing-Sky Rooftop Pin", "晴", "silver cloud edges opening above rain-dark rooftops"]
  ],
  T04: [
    ["苔藓石阶石片", "Moss-Step Stone Token", "苔", "moss-covered steps leading quietly into the forest"],
    ["树洞信箱叶邮票", "Tree-Hollow Leaf Stamp", "叶", "tiny letters and leaf postage tucked inside an old tree"],
    ["蘑菇圆环木扣", "Mushroom-Ring Wood Button", "菇", "a careful ring of mushrooms under broken woodland light"],
    ["萤火小径光瓶", "Firefly Path Light Vial", "萤", "fireflies marking a path through the night forest"],
    ["晨露出口羽叶签", "Dewlit Forest Bookmark", "露", "the forest path glowing with dew at the way out"],
    ["溪边木桥水滴扣", "Creek Bridge Droplet Clasp", "溪", "clear creek water moving beneath a mossy footbridge"],
    ["松果茶亭木坠", "Pinecone Tea-Shelter Charm", "松", "a woodland tea shelter tucked among fallen pinecones"],
    ["鸟巢观察镜徽", "Nest-Watch Lens Brooch", "鸟", "a small nest glimpsed safely through leafy branches"],
    ["月下蕨叶银牌", "Moonlit Fern Silver Tag", "蕨", "fern fronds turning silver beneath the forest moon"],
    ["林口晨光橡果章", "Sunrise Acorn Token", "果", "an acorn warmed by the first light at the forest edge"]
  ],
  T05: [
    ["蓝帐篷织片", "Indigo Tent Weave", "帐", "indigo tent cloth billowing like a sea in the desert wind"],
    ["铜壶茶摊茶匙", "Copper Teahouse Spoon", "茶", "hot mint tea poured from a burnished copper pot"],
    ["香料小巷香囊", "Spice-Lane Sachet", "香", "bright mounds of spice filling a narrow market lane"],
    ["骆铃沙丘铜铃", "Dune Caravan Bell", "铃", "a caravan bell approaching slowly across the dunes"],
    ["夜晚星盘吊牌", "Desert Astrolabe Tag", "星", "an astrolabe charting a path beneath the low desert stars"],
    ["彩毯摊位流苏扣", "Carpet-Stall Tassel Clasp", "毯", "handwoven carpet tassels moving in the market breeze"],
    ["陶灯巷火苗坠", "Clay-Lantern Alley Charm", "灯", "pierced clay lanterns casting patterned light on the alley"],
    ["枣椰篮编织牌", "Date-Palm Basket Tag", "枣", "ripe dates gathered in a tightly woven palm basket"],
    ["沙丘月影银章", "Moon-Dune Silver Brooch", "月", "a silver crescent resting above quiet night dunes"],
    ["晨市拱门铜印", "Dawn Bazaar Arch Token", "门", "the market arch opening as the first stalls wake"]
  ],
  T06: [
    ["雪灯小路灯坠", "Snow-Lantern Charm", "雪", "a row of warm lanterns glowing beneath falling snow"],
    ["木桶温泉木牌", "Cedar Hot-Spring Plaque", "汤", "cedar baths and quiet ribbons of mountain steam"],
    ["围巾长椅毛线扣", "Red Scarf Wool Clasp", "巾", "a red scarf left on a snow-covered bench"],
    ["雪人邮筒红印", "Snowman Postbox Seal", "邮", "a small snowman keeping watch beside the red postbox"],
    ["融雪归桥冰纹片", "Thawing Bridge Ice Token", "融", "meltwater beginning to speak beneath the bridge"],
    ["雪檐冰柱玻璃坠", "Snow-Eave Icicle Charm", "冰", "clear icicles catching blue light beneath a cedar eave"],
    ["温泉旅笼木钥牌", "Hot-Spring Inn Key Tag", "宿", "a carved wooden key from a warm mountain inn"],
    ["蒸汽桥足迹徽", "Steam-Bridge Footprint Pin", "迹", "small footprints crossing a bridge through hot-spring steam"],
    ["雪松茶杯陶扣", "Cedar Tea-Cup Clasp", "杯", "a tiny ceramic cup warming hands beside the snow"],
    ["朝阳雪峰金边章", "Sunrise Snowpeak Brooch", "峰", "golden dawn touching the highest snow-covered ridge"]
  ],
  T07: [
    ["睡莲池边花章", "Water-Lily Pond Badge", "莲", "a water lily opening beside a waiting dragonfly"],
    ["小船栈桥船桨针", "Garden Jetty Oar Pin", "桨", "a small wooden boat tugging softly at the garden jetty"],
    ["白花拱门香片", "White-Arbor Scent Card", "香", "white blossoms arching above a quiet gravel path"],
    ["旧温室玻璃叶", "Old Glasshouse Leaf", "温", "tall tropical leaves blurred by greenhouse mist"],
    ["湖心晨光波纹坠", "First-Light Ripple Pendant", "波", "the first golden ripples moving across the lake"],
    ["蔷薇长椅花扣", "Rose-Bench Blossom Clasp", "蔷", "garden roses leaning over an old lakeside bench"],
    ["蜻蜓水面玻璃针", "Dragonfly Water-Glass Pin", "蜓", "a blue dragonfly hovering above the still pond"],
    ["黄昏茶亭瓷牌", "Twilight Tea-Pavilion Tile", "亭", "a porcelain tea set glowing in the lakeside pavilion"],
    ["柳影小径叶坠", "Willow-Path Leaf Charm", "柳", "willow leaves brushing a path at the water’s edge"],
    ["晨雾花园钥匙", "Morning-Garden Key", "钥", "an ornate garden key found as morning mist lifts"]
  ],
  T08: [
    ["青石桥桥纹牌", "Bluestone Bridge Plaque", "桥", "a rain-polished stone bridge carrying footsteps over the river"],
    ["灯笼茶馆茶签", "Lantern Teahouse Marker", "茶", "red lanterns and the clear ring of teacups by the window"],
    ["纸伞铺伞骨扣", "Paper Parasol Clasp", "伞", "painted parasols opening like small roofs of sky"],
    ["糖画小摊糖鸟章", "Sugar-Bird Market Badge", "糖", "a ribbon of molten sugar becoming a tiny bird"],
    ["桥头月灯铜铃", "Moonlit Bridge Bell", "月", "a single lantern holding moonlight above the old bridge"],
    ["青瓦屋脊兽坠", "Blue-Tile Roof Guardian Charm", "瓦", "a tiny roof guardian above rows of blue-gray tiles"],
    ["河埠木船桨扣", "Riverside Sampan Oar Clasp", "舟", "a wooden sampan tied beside the old stone quay"],
    ["戏台云纹脸谱章", "Opera-Stage Mask Brooch", "戏", "painted opera colors beneath carved cloud-pattern eaves"],
    ["桂花巷香木牌", "Osmanthus Lane Wood Tag", "桂", "osmanthus fragrance drifting through a narrow lane"],
    ["晨市竹篮铜扣", "Morning-Market Basket Token", "篮", "a bamboo basket filled at the waking riverside market"]
  ],
  T09: [
    ["恐龙骨架化石章", "Dinosaur Hall Fossil Badge", "骨", "the towering skeleton in the museum’s first gallery"],
    ["古地图展柜折页", "Antique Map Folio", "图", "a time-softened map preserved beneath glass"],
    ["纪念章台馆印", "Museum Gallery Seal", "馆", "the satisfying press of a gallery stamp into a blank card"],
    ["玻璃穹顶棱镜片", "Glass-Dome Prism", "光", "daylight divided into quiet panes by the museum dome"],
    ["闭馆大厅导览牌", "After-Hours Gallery Tag", "闭", "the final hush settling over the hall before closing"],
    ["古陶展柜陶片坠", "Ancient Pottery Shard Charm", "陶", "a patterned pottery fragment studied beneath museum glass"],
    ["自然标本蝴蝶针", "Natural-History Butterfly Pin", "蝶", "a carefully illustrated butterfly from the natural-history room"],
    ["雕塑长廊石膏章", "Sculpture Gallery Cameo", "塑", "a classical plaster profile from the sculpture corridor"],
    ["天文展厅星仪扣", "Astronomy Hall Orrery Clasp", "仪", "a miniature orrery turning beneath the planetarium dome"],
    ["馆藏钥匙黄铜牌", "Archive Key Brass Tag", "藏", "a brass archive key from the museum’s quiet collection room"]
  ],
  T10: [
    ["篝火余烬珐琅章", "Campfire Ember Enamel", "火", "the last warm embers beside a well-used camp chair"],
    ["望远镜草坡镜盖", "Hilltop Telescope Cap", "望", "a telescope trained on one slow-moving point of light"],
    ["帐篷灯影绳扣", "Tent-Lantern Cord Clasp", "营", "a small lamp casting a home-like shadow across canvas"],
    ["银河山脊星图片", "Milky Way Ridge Chart", "河", "the galaxy opening like a path above the ridge"],
    ["流星瞬间许愿坠", "Falling-Star Wish Charm", "愿", "the brief silver trail of a wish already on its way"],
    ["松林营绳木扣", "Pine-Camp Rope Toggle", "松", "a sturdy rope toggle scented by the night pine forest"],
    ["月相搪瓷转盘", "Moon-Phase Enamel Dial", "月", "the moon’s phases arranged on a small midnight-blue dial"],
    ["夜航猫头鹰徽", "Night-Owl Camp Brooch", "鸮", "an owl watching quietly beyond the firelight"],
    ["晨露搪瓷杯牌", "Dewy Camp Mug Tag", "杯", "a speckled camp mug beaded with dawn dew"],
    ["日出山脊罗盘", "Sunrise Ridge Compass", "针", "a pocket compass pointing home from the sunrise ridge"]
  ],
  T11: [
    ["潜艇舷窗铜圈", "Submarine Porthole Ring", "潜", "blue ocean light moving beyond a round submarine window"],
    ["珊瑚拱门枝饰", "Coral Arch Brooch", "珊", "warm coral branches forming a gate beneath the sea"],
    ["海草邮路贝壳签", "Seagrass Post Shell Marker", "贝", "a shell parcel waiting along the swaying seagrass post road"],
    ["发光水母光坠", "Moon-Jelly Glow Pendant", "浮", "a translucent jellyfish drifting like a living lantern"],
    ["深蓝灯塔琉璃标", "Deep-Sea Lighthouse Glass", "塔", "a gentle lighthouse beam crossing the deep-blue water"],
    ["海马花园金坠", "Seahorse Garden Gold Charm", "马", "a tiny seahorse curled among waving coral branches"],
    ["珍珠贝床珠扣", "Pearl-Shell Bed Clasp", "珠", "a luminous pearl resting inside a softly ridged shell"],
    ["章鱼沉船铜章", "Octopus Wreck Token", "章", "a curious octopus exploring an old brass porthole"],
    ["蓝鲸远歌银针", "Blue-Whale Song Pin", "鲸", "a distant whale song traveling through open blue water"],
    ["晨光海面潜水牌", "Surface-Light Dive Tag", "光", "sunbeams descending from the bright ocean surface"]
  ],
  T12: [
    ["苹果木门木牌", "Orchard Gate Wood Tag", "苹", "an old gate opening beneath branches heavy with apples"],
    ["蜂箱花田蜜蜡章", "Wildflower Beeswax Seal", "蜜", "sunlit pollen and the busy hum beside the hives"],
    ["谷仓午睡草编扣", "Hayloft Woven Clasp", "仓", "a quiet nap in the stripe of light inside the red barn"],
    ["烘焙小屋麦穗签", "Bakery Wheat Marker", "麦", "warm bread and a small bouquet of wheat by the cottage window"],
    ["苹果派露台果香牌", "Apple-Pie Terrace Plaque", "派", "apple pie cooling beside tea in the orchard breeze"],
    ["奶牛牧铃铜坠", "Pasture Cowbell Charm", "铃", "a small bronze bell sounding across the green pasture"],
    ["果酱厨房红格盖", "Jam-Kitchen Gingham Lid", "酱", "berry jam cooling beneath a red gingham cover"],
    ["风车谷仓木章", "Barn Windmill Token", "磨", "a little windmill turning beside the red barn"],
    ["南瓜田藤蔓扣", "Pumpkin-Patch Vine Clasp", "瓜", "a curling green vine around a bright autumn pumpkin"],
    ["晨露牛奶瓶牌", "Dawn Milk-Bottle Tag", "奶", "a glass milk bottle waiting in the cool orchard dawn"]
  ],
  T13: [
    ["浮云登机桥云票", "Cloudbridge Boarding Pass", "云", "a soft cloud bridge leading toward the little skyport"],
    ["飞艇泊位黄铜桨", "Airship Mooring Brass Fin", "艇", "a warm-toned airship waiting at its timber berth"],
    ["气象球棚晴雨珠", "Weather-Orb Bead", "晴", "the day’s weather held inside a translucent sky-blue sphere"],
    ["风向标塔旋针", "Wind-Vane Tower Pin", "风", "the unseen route traced by a turning wind vane"],
    ["返航灯航路牌", "Homeward Beacon Route Tag", "航", "golden return lights appearing across the evening cloud sea"],
    ["云岛邮局翼章", "Cloud-Island Post Wing", "翼", "a winged parcel leaving the tiny cloud-island post office"],
    ["彩虹燃料玻璃瓶", "Rainbow-Fuel Glass Vial", "虹", "a small glass vial holding layered rainbow light"],
    ["星图航线罗盘", "Star-Route Navigator", "图", "a brass navigator aligned with the skyport star chart"],
    ["晨航行李螺旋扣", "Dawn-Flight Luggage Clasp", "旋", "a propeller-shaped clasp from the first morning flight"],
    ["云海塔台耳机牌", "Cloud-Control Headset Tag", "塔", "a miniature headset from the skyport control tower"]
  ],
  T14: [
    ["黑沙海岸砂岩瓶", "Black-Sand Shore Vial", "沙", "fine volcanic sand beside a breathing horizon"],
    ["熔岩观景台火纹章", "Lava Overlook Fire Crest", "熔", "a slow river of lava seen safely from the stone overlook"],
    ["蒸汽温泉谷雾石", "Steam-Valley Mist Stone", "汽", "white geothermal steam curling between rust-red rocks"],
    ["玄武岩桥六角片", "Basalt Bridge Hex Token", "岩", "six-sided basalt columns crossing a muted red glow"],
    ["星夜火山口余热坠", "Starlit Crater Ember Charm", "热", "the crater’s last warmth beneath a field of stars"],
    ["硫黄花坡花针", "Sulfur-Slope Flower Pin", "花", "a tiny yellow flower blooming beside warm volcanic stone"],
    ["黑曜石夜光坠", "Obsidian Night Charm", "曜", "polished black volcanic glass reflecting a line of fire"],
    ["地热厨房陶锅扣", "Geothermal Pot Clasp", "锅", "a small earthenware pot warmed by rising geothermal steam"],
    ["熔光洞口矿石牌", "Lava-Cave Mineral Tag", "洞", "a dark mineral fragment edged with deep orange glow"],
    ["冷却岩路苔藓章", "New-Moss Lava Token", "苔", "new green moss taking hold on cooled black lava"]
  ],
  T15: [
    ["晶簇入口棱晶", "Crystal-Threshold Prism", "晶", "daylight breaking into fragments at the crystal-lined entrance"],
    ["地下河舟蓝光桨", "Underground River Oar", "舟", "a small boat carrying blue reflections across the underground river"],
    ["萤石阶梯夜光片", "Fluorite Stair Glow Tile", "萤", "green fluorite lighting each step into the cavern"],
    ["回声大厅音纹环", "Echo Hall Resonance Ring", "声", "one small sound returning three times through the great chamber"],
    ["水镜洞室镜石", "Mirror-Pool Cave Stone", "镜", "the still pool reflecting an entire ceiling of crystal"],
    ["蓝光矿脉银坠", "Blue-Vein Silver Charm", "蓝", "a silver pendant crossed by a luminous blue mineral vein"],
    ["石笋花园石章", "Stalagmite Garden Token", "笋", "a miniature limestone spire shaped by ancient water"],
    ["矿车小站轮扣", "Cavern Minecart Wheel", "车", "a tiny iron wheel from the lamp-lit underground station"],
    ["暖灯营地铜灯针", "Warm-Camp Lantern Pin", "灯", "a brass cave lantern casting a small circle of home-like light"],
    ["出口晨光彩晶牌", "Daybreak Crystal Tag", "彩", "a clear crystal scattering rainbow light at the cavern exit"]
  ]
};

export const legacySouvenirs = themes.flatMap(theme =>
  souvenirBadgeVariants.map((variant, index) => {
    const [name, englishName, , englishInspiration] = themeSouvenirCatalog[theme.id][index];
    const scene = theme.scenes[[0, 1, 2, 6, 11, 3, 4, 5, 8, 9][index]];
    const id = `${theme.id}-SV${String(index + 1).padStart(2, "0")}`;
    return {
      id,
      themeId: theme.id,
      name,
      englishName,
      description: scene.visual,
      englishDescription: `${englishInspiration.charAt(0).toUpperCase()}${englishInspiration.slice(1)}.`,
      type: variant.type,
      displayMode: "souvenir_thumbnail",
      asset: `./assets/souvenirs/phase1/${id}.webp`,
      assetAlt: `${name}纪念品缩略图`,
      assetScale: 1.08,
      rarity: index >= 8 ? "rare" : index >= 4 ? "uncommon" : "common"
    };
  })
);

// Phase 1 routes use their own ten-item souvenir pools. The global library is
// reserved for Phase 2 real-landmark rewards.
export const souvenirs = [...souvenirLibrary, ...legacySouvenirs];

export function getTheme(themeId) {
  return themes.find(theme => theme.id === themeId) ?? themes[0];
}

export function getScene(themeId, sceneId) {
  const theme = getTheme(themeId);
  return theme.scenes.find(scene => scene.id === sceneId) ?? theme.scenes[0];
}
