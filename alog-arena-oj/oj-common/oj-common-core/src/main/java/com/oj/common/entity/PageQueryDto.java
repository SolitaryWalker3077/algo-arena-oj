package com.oj.common.entity;

import lombok.Data;

@Data
public class PageQueryDto {

    private Integer pageSize = 10; //每页数量 必传 给默认值为一页10条数量

    private Integer pageNum = 1; //第几页 必传 给默认值第一页
}
