create table tb_exam
(
    exam_id     bigint unsigned   not null comment '竞赛id'
        primary key,
    title       varchar(50)       not null comment '竞赛标题',
    start_time  datetime          not null comment '竞赛开始时间',
    end_time    datetime          not null comment '竞赛结束时间',
    status      tinyint default 0 not null comment '发布状态 0:未发布 1:已发布,默认为0:未发布',
    create_by   bigint            not null comment '创建人',
    create_time datetime          not null comment '创建时间',
    update_by   bigint            null comment '更新用户',
    update_time datetime          null comment '更新时间'
);

create table tb_exam_question
(
    exam_question_id bigint unsigned not null comment '竞赛题目关系id(主键)'
        primary key,
    question_id      bigint unsigned not null comment '题目id(主键)',
    exam_id          bigint unsigned not null comment '竞赛id(主键)',
    question_order   bigint          not null comment '题目顺序',
    create_by        bigint          not null comment '创建人',
    create_time      datetime        not null comment '创建时间',
    update_by        bigint          not null comment '更新用户',
    update_time      datetime        not null comment '更新时间'
);

create table tb_message
(
    message_id  bigint unsigned not null comment '消息id（主键）'
        primary key,
    text_id     bigint unsigned not null comment '消息内容id（主键）',
    send_id     bigint unsigned not null comment '消息发送人id',
    rec_id      bigint unsigned not null comment '消息接收人id',
    create_by   bigint unsigned not null comment '创建人',
    create_time datetime        not null comment '创建时间',
    update_by   bigint unsigned null comment '更新人',
    update_time datetime        null comment '更新时间'
);

create table tb_message_text
(
    text_id         bigint unsigned not null comment '消息内容id（主键）'
        primary key,
    message_title   varchar(30)     not null comment '消息标题',
    message_content varchar(200)    not null comment '消息内容',
    create_by       bigint unsigned not null comment '创建人',
    create_time     datetime        not null comment '创建时间',
    update_by       bigint unsigned null comment '更新人',
    update_time     datetime        null comment '更新时间'
);

create table tb_question
(
    question_id   bigint unsigned not null comment '题目id'
        primary key,
    title         varchar(50)     not null comment '题目标题',
    difficult     tinyint         not null comment '题目难度1：简单  2：中等  3：困难',
    time_limit    int             null comment '时间限制',
    space_limit   int             null comment '空间限制',
    content       varchar(1000)   null comment '题目内容',
    question_case varchar(1000)   null comment '题目用例',
    default_code  varchar(500)    null comment '默认代码块',
    main_fac      varchar(500)    null comment 'main函数',
    create_by     bigint          not null comment '创建人',
    create_time   datetime        not null comment '创建时间',
    update_by     bigint          null comment '更新用户',
    update_time   datetime        null comment '更新时间'
);

create table tb_sys_user
(
    user_id      bigint unsigned not null comment '⽤⼾id'
        primary key,
    user_account varchar(32)     null comment '⽤⼾账号',
    password     varchar(100)    null comment '⽤⼾密码',
    nick_name    varchar(32)     null comment '昵称',
    create_by    bigint          not null comment '创建⽤⼾',
    create_time  datetime        not null comment '创建时间',
    update_by    bigint          null comment '更新⽤⼾',
    update_time  datetime        null comment '更新时间',
    constraint user_account
        unique (user_account)
)
    comment '管理端⽤⼾表';

create table tb_test
(
    test_id bigint unsigned not null
        primary key,
    title   text            not null,
    content text            not null
);

create table tb_user
(
    user_id     bigint unsigned not null comment '用户id（主键）'
        primary key,
    nick_name   varchar(20)     null comment '用户昵称',
    head_image  varchar(100)    null comment '用户头像',
    sex         tinyint         null comment '用户状态1: 男  2：女',
    phone       char(11)        not null comment '手机号',
    code        char(6)         null comment '验证码',
    email       varchar(20)     null comment '邮箱',
    wechat      varchar(20)     null comment '微信号',
    school_name varchar(20)     null comment '学校',
    major_name  varchar(20)     null comment '专业',
    introduce   varchar(100)    null comment '个人介绍',
    status      tinyint         not null comment '用户状态0: 拉黑  1：正常',
    create_by   bigint unsigned not null comment '创建人',
    create_time datetime        not null comment '创建时间',
    update_by   bigint unsigned null comment '更新人',
    update_time datetime        null comment '更新时间'
);

create table tb_user_exam
(
    user_exam_id bigint unsigned not null comment '用户竞赛关系id'
        primary key,
    user_id      bigint unsigned not null comment '用户id',
    exam_id      bigint unsigned not null comment '竞赛id',
    score        int unsigned    null comment '得分',
    exam_rank    int unsigned    null comment '排名',
    create_by    bigint unsigned not null comment '创建人',
    create_time  datetime        not null comment '创建时间',
    update_by    bigint unsigned null comment '更新人',
    update_time  datetime        null comment '更新时间'
);

create table tb_user_submit
(
    submit_id      bigint unsigned not null comment '提交记录id'
        primary key,
    user_id        bigint unsigned not null comment '用户id',
    question_id    bigint unsigned not null comment '题目id',
    exam_id        bigint unsigned null comment '竞赛id',
    program_type   tinyint         not null comment '代码类型 0 java   1 CPP',
    user_code      text            not null comment '用户代码',
    pass           tinyint         not null comment '0：未通过  1：通过',
    exe_message    text            null comment '执行结果',
    case_judge_res varchar(1000)   null comment '输出结果',
    score          int default 0   not null comment '得分',
    create_by      bigint unsigned not null comment '创建人',
    create_time    datetime        not null comment '创建时间',
    update_by      bigint unsigned null comment '更新人',
    update_time    datetime        null comment '更新时间'
);


