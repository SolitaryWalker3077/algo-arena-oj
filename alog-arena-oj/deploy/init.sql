use oj_dev;
drop table if exists `tb_sys_user`;

create table `tb_sys_user` (
    `user_id` bigint(20) unsigned NOT NULL COMMENT '⽤⼾id',
    `user_account` varchar(32) DEFAULT NULL COMMENT '⽤⼾账号',
    `password` varchar(100) DEFAULT NULL COMMENT '⽤⼾密码',
    `nick_name` varchar(32) DEFAULT NULL COMMENT '昵称',
    `create_by` bigint(8) NOT NULL COMMENT '创建⽤⼾',
    `create_time` datetime NOT NULL COMMENT '创建时间',
    `update_by` bigint(8) DEFAULT NULL COMMENT '更新⽤⼾',
    `update_time` datetime DEFAULT NULL COMMENT '更新时间',
    PRIMARY KEY (`user_id`),
    UNIQUE KEY `user_account` (`user_account`)
)  ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理端⽤⼾表';


-- 题库管理：
-- B端： 列表功能，添加题目，删除题目，编辑题目

-- C端： 题库列表功能，题目热榜，答题，竞赛开始答题，竞赛练习

-- 题目数据

create table 'tb_question' (
    `question_id` bigint unsigned not null comment '题目id',
    `title` varchar(50) not null comment '题目标题',
    `difficult` tinyint not null comment '题目难度1：简单  2：中等  3：困难',
    `time_limit` int comment '时间限制',  -- 毫秒
    `space_limit` int comment '空间限制', -- 字节
    `content` varchar(1000) comment '题目内容',
    `question_case` varchar(1000) comment '题目用例',
    `default_code` varchar(500) comment '默认代码块',
    'main_fac' varchar(500) comment 'main函数',
    `create_by` bigint not null comment '创建人',
    `create_time` datetime not null comment '创建时间',
    `update_by` bigint not null comment '更新用户',
    `update_time` datetime not null comment '更新时间',
    primary key (`question_id`)
);
