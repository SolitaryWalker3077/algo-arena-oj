package com.oj.friend.controller.exam;

import com.oj.common.controller.BaseController;
import com.oj.common.entity.Result;
import com.oj.common.entity.TableDataInfo;
import com.oj.friend.entity.exam.dto.ExamQueryDto;
import com.oj.friend.service.exam.IExamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/exam")
@Tag(name = "C端竞赛")
public class ExamController extends BaseController {


    @Autowired
    private IExamService examService;

    //列表:接口地址: /exam/list
    @Operation(summary = "C端竞赛列表")
    @GetMapping("/semiLogin/list")
    public TableDataInfo list(@Validated ExamQueryDto examQueryDto) {
        return getDataTable(examService.list(examQueryDto));
    }

    @Operation(summary = "C端竞赛列表优化:引入redis")
    @GetMapping("/semiLogin/redis/list")
    public TableDataInfo RedisList(@Validated ExamQueryDto examQueryDto) {
        return examService.redisList(examQueryDto);
    }


    @GetMapping("/getFirstQuestion")
    public Result<String> getFirstQuestion(Long examId) {
        //获取竞赛中的题目顺序列表,把排在第一个的题目返回给前端
        // 代码逻辑： 获取竞赛中题目的顺序列表   先从redis  redis中没有数据查询数据库  list  数据类型  key: e:q:l:examId   value : questionId
        return Result.success(examService.getFirstQuestion(examId));
    }
}


